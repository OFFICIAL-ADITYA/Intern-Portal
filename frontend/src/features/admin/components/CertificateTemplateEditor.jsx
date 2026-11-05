import { useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
import QRCode from "qrcode";

import "grapesjs/dist/css/grapes.min.css";
import "./CertificateTemplateEditor.css";

const A4_WIDTH = 1123;
const A4_HEIGHT = 794;

const SAMPLE_QR_URL =
  "https://example.com/verify/CERT-2026-00019";

function extractTemplateParts(templateHtml = "") {
  let html = String(templateHtml);

  // Extract all <style>...</style> blocks
  const styleMatches = [
    ...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
  ];

  const css = styleMatches
    .map((match) => match[1])
    .join("\n");

  // Remove <style> blocks from HTML
  html = html.replace(
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    ""
  );

  // If a <body> exists, use only its contents
  const bodyMatch = html.match(
    /<body[^>]*>([\s\S]*?)<\/body>/i
  );

  if (bodyMatch) {
    html = bodyMatch[1];
  }

  // Remove document-level tags
  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<body[^>]*>/gi, "")
    .replace(/<\/body>/gi, "")
    .trim();

  return {
    html,
    css,
  };
}

export default function CertificateTemplateEditor({
  initialHtml = "",
  onSave,
  onChange,
  onDirtyChange,
  onEditorReady,
  readOnly = false,
  saving = false,
}) {
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const initialHtmlRef = useRef(initialHtml);
  const savedHtmlRef = useRef(initialHtml);
  const readOnlyRef = useRef(readOnly);
  const hasUnsavedChangesRef = useRef(false);
  const serializeRef = useRef(() => initialHtmlRef.current);
  const [initializing, setInitializing] = useState(true);
  const [saveError, setSaveError] = useState("");

  // Always keep the latest onSave function
  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
    onDirtyChangeRef.current = onDirtyChange;
    onEditorReadyRef.current = onEditorReady;
    readOnlyRef.current = readOnly;
  }, [onSave, onChange, onDirtyChange, onEditorReady, readOnly]);

  useEffect(() => {
    let cancelled = false;
    let changeTimer;

    const initializeEditor = async () => {
      if (!editorContainerRef.current) {
        return;
      }

      // Destroy previous GrapesJS instance
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          console.warn(
            "Could not destroy previous editor:",
            error
          );
        }

        editorRef.current = null;
      }

      // --------------------------------------------------
      // Generate sample QR code for the editor
      // --------------------------------------------------
      let qrDataUrl = "";

      try {
        qrDataUrl = await QRCode.toDataURL(
          SAMPLE_QR_URL,
          {
            width: 180,
            margin: 1,
            errorCorrectionLevel: "M",
          }
        );
      } catch (error) {
        console.error(
          "QR generation failed:",
          error
        );
      }

      if (cancelled) {
        return;
      }

      // --------------------------------------------------
      // Split CSS and HTML
      // --------------------------------------------------
      const parts = extractTemplateParts(initialHtmlRef.current);

      let editorHtml = parts.html;

      // Replace QR placeholder with sample QR image
      if (qrDataUrl) {
        editorHtml = editorHtml.replace(
          /\{\{\s*qrCodeUrl\s*\}\}/gi,
          qrDataUrl
        );
      }

      // --------------------------------------------------
      // Initialize GrapesJS
      // --------------------------------------------------
      const editor = grapesjs.init({
        container: editorContainerRef.current,

        height: `${A4_HEIGHT}px`,

        width: "100%",

        storageManager: false,

        undoManager: {
          track: true,
        },

        selectorManager: {
          componentFirst: true,
        },

        panels: {
          defaults: [],
        },

        blockManager: {
          appendTo: "#certificate-blocks",
        },

        deviceManager: {
          devices: [
            {
              id: "a4-landscape",
              name: "A4 Landscape",
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
            },
          ],
        },

        // --------------------------------------------------
        // GrapesJS canvas styling
        // --------------------------------------------------
        canvas: {
          styles: [
            `
            * {
              box-sizing: border-box;
            }

            html {
              margin: 0;
              padding: 0;
              width: ${A4_WIDTH}px;
              min-height: ${A4_HEIGHT}px;
              background: #ffffff !important;
            }

            body {
              margin: 0;
              padding: 0;
              width: ${A4_WIDTH}px;
              min-height: ${A4_HEIGHT}px;
              background: #ffffff !important;
              color: #111827 !important;
              overflow: visible;
            }

            img {
              max-width: 100%;
            }
            `,
          ],
        },

        // --------------------------------------------------
        // Style manager
        // --------------------------------------------------
        styleManager: {
          sectors: [
            {
              name: "Dimension",
              open: false,
              properties: [
                "width",
                "height",
                "max-width",
                "min-height",
                "margin",
                "padding",
              ],
            },

            {
              name: "Typography",
              open: false,
              properties: [
                "font-family",
                "font-size",
                "font-weight",
                "color",
                "line-height",
                "text-align",
                "letter-spacing",
              ],
            },

            {
              name: "Decorations",
              open: false,
              properties: [
                "background-color",
                "border",
                "border-radius",
                "box-shadow",
              ],
            },
          ],
        },

        traitManager: {
          appendTo: ".gjs-traits-container",
        },
      });

      editorRef.current = editor;

      // --------------------------------------------------
      // Load original CSS
      // --------------------------------------------------
      if (parts.css.trim()) {
        editor.setStyle(parts.css);
      }

      // --------------------------------------------------
      // Load certificate HTML
      // --------------------------------------------------
      editor.setComponents(editorHtml);

      const serialize = () => {
        let html = editor.getHtml();
        if (qrDataUrl) html = html.replaceAll(qrDataUrl, "{{qrCodeUrl}}");
        return `<style>\n${editor.getCss()}\n</style>\n${html}`.trim();
      };

      const emitChange = () => {
        if (readOnlyRef.current || typeof onChangeRef.current !== "function") return;
        window.clearTimeout(changeTimer);
        changeTimer = window.setTimeout(() => {
          const content = serialize();
          hasUnsavedChangesRef.current = content !== savedHtmlRef.current;
          onDirtyChangeRef.current?.(hasUnsavedChangesRef.current);
          onChangeRef.current(content);
        }, 180);
      };
      editor.on("update", emitChange);
      editor.on("component:update", emitChange);
      editor.on("style:property:update", emitChange);

      const insertPlaceholder = (placeholder) => {
        if (readOnlyRef.current) return;
        const selected = editor.getSelected();
        if (selected) selected.append(placeholder);
        else editor.addComponents(placeholder);
        emitChange();
      };

      serializeRef.current = serialize;

      onEditorReadyRef.current?.({
        insertPlaceholder,
        getHtml: serialize,
        markSaved: () => {
          savedHtmlRef.current = serialize();
          hasUnsavedChangesRef.current = false;
          onDirtyChangeRef.current?.(false);
        },
      });

      // --------------------------------------------------
      // Force A4 white canvas after GrapesJS loads
      // --------------------------------------------------
      editor.on("load", () => {
        const frame = editor.Canvas.getFrameEl();

        if (!frame) {
          return;
        }

        const frameDocument = frame.contentDocument;

        if (!frameDocument) {
          return;
        }

        const htmlElement =
          frameDocument.documentElement;

        const bodyElement =
          frameDocument.body;

        htmlElement.style.width =
          `${A4_WIDTH}px`;

        htmlElement.style.minHeight =
          `${A4_HEIGHT}px`;

        htmlElement.style.background =
          "#ffffff";

        bodyElement.style.width =
          `${A4_WIDTH}px`;

        bodyElement.style.minHeight =
          `${A4_HEIGHT}px`;

        bodyElement.style.margin = "0";

        bodyElement.style.padding = "0";

        bodyElement.style.background =
          "#ffffff";

        bodyElement.style.color =
          "#111827";

        bodyElement.style.overflow =
          "visible";
      });

      // --------------------------------------------------
      // Save command
      // --------------------------------------------------
      editor.Commands.add(
        "certificate-save",
        {
          run() {
            if (
              typeof onSaveRef.current ===
              "function"
            ) {
              onSaveRef.current(serialize());
            }
          },
        }
      );

      setInitializing(false);
    };

    initializeEditor();

    // --------------------------------------------------
    // Cleanup
    // --------------------------------------------------
    return () => {
      cancelled = true;
      window.clearTimeout(changeTimer);

      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          console.warn(
            "Could not destroy editor:",
            error
          );
        }

        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`certificate-template-editor ${readOnly ? "is-read-only" : ""}`}>
      {initializing && (
        <div className="certificate-editor-loading-skeleton" role="status">
          <span className="certificate-editor-loading-spinner" />
          Preparing the A4 editor…
        </div>
      )}
      {onSave && (
        <div className="certificate-editor-actions">
          <div>
            {saveError && <p className="certificate-editor-save-error" role="alert">{saveError}</p>}
            {saveError && <button type="button" className="certificate-editor-retry" onClick={async () => {
              setSaveError("");
              try {
                await onSaveRef.current?.(serializeRef.current());
                savedHtmlRef.current = serializeRef.current();
                hasUnsavedChangesRef.current = false;
                onDirtyChangeRef.current?.(false);
              } catch (error) {
                setSaveError(error.message || "Unable to save. Retry the save when ready.");
              }
            }}>Retry save</button>}
          </div>
          <button
            type="button"
            disabled={readOnly || saving || initializing}
            onClick={async () => {
              setSaveError("");
              try {
                const saved = await onSaveRef.current?.(serializeRef.current());
                if (saved !== false) {
                  savedHtmlRef.current = serializeRef.current();
                  hasUnsavedChangesRef.current = false;
                  onDirtyChangeRef.current?.(false);
                }
              } catch (error) {
                setSaveError(error.message || "Unable to save. Retry the save when ready.");
              }
            }}
          >
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      )}
      <div
        id="certificate-blocks"
        style={{ display: "none" }}
      />

      <div
        ref={editorContainerRef}
        className="certificate-editor-canvas"
      />

      <UnloadWarning refValue={hasUnsavedChangesRef} />
    </div>
  );
}

function UnloadWarning({ refValue }) {
  useEffect(() => {
    const warn = (event) => {
      if (!refValue.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [refValue]);
  return null;
}
