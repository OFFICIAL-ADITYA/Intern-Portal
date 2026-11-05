import { useEffect, useMemo, useRef, useState } from "react";
import CertificateTemplateEditor from "../components/CertificateTemplateEditor";
import Toast from "../../../shared/components/Toast";
import {
  createCertificateTemplate,
  getCertificateTemplates,
  getTemplatePlaceholders,
  updateCertificateTemplate,
} from "../services/admin.service";

const SAMPLE_DATA = {
  fullName: "Sarvesh Choudhary",
  internCode: "UPT-2026-001",
  domain: "Web Development",
  startDate: "01 October 2026",
  endDate: "31 December 2026",
  issueDate: "06 October 2026",
  requestNumber: "CERT-2026-00019",
  certificateTitle: "Certificate of Completion",
  qrCodeUrl: "https://example.com/verify/CERT-2026-00019",
};

function getTemplateHtml(template) {
  return template?.htmlContent || template?.content || "";
}

function replacePlaceholders(html) {
  if (!html) return "";

  let previewHtml = html;

  Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    previewHtml = previewHtml.replace(placeholder, value);
  });

  return previewHtml;
}

export default function CertificateTemplateEditorPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [placeholders, setPlaceholders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [previewMode, setPreviewMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [workingHtml, setWorkingHtml] = useState("");
  const [editorController, setEditorController] = useState(null);
  const [templateDetails, setTemplateDetails] = useState({
    templateCode: "",
    templateName: "",
    certificateType: "custom",
    title: "Certificate",
    status: "draft",
  });
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!isDirtyRef.current || !link || link.target === "_blank" || link.hasAttribute("download")) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin || next.href === window.location.href) return;
      if (!window.confirm("You have unsaved template changes. Leave this page and discard them?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, []);

  const starterHtml = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;min-height:794px;padding:80px;background:#fff;color:#172554;font-family:Arial,sans-serif;text-align:center}.certificate{border:8px double #d4a72c;min-height:620px;padding:70px 36px}h1{color:#123a67;font-size:42px}p{font-size:20px}</style></head><body><main class="certificate"><h1>{{certificateTitle}}</h1><p>This certificate is presented to</p><h2>{{fullName}}</h2><p>For completing {{domain}}</p><p>{{startDate}} — {{endDate}}</p><p>Certificate {{requestNumber}}</p><img width="100" src="{{qrCodeUrl}}" alt="Verification QR code"></main></body></html>`;

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) {
      return null;
    }

    return (
      templates.find(
        (template) => template._id === selectedTemplateId
      ) || null
    );
  }, [selectedTemplateId, templates]);

  /*
   * Load certificate templates
   */
  useEffect(() => {
    let mounted = true;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCertificateTemplates();

        if (!mounted) return;

        const templateList = response?.templates || [];

        const validTemplates = templateList.filter(
          (template) =>
            template?._id &&
            template?.templateCode &&
            template?.templateName
        );

        setTemplates(validTemplates);

        if (validTemplates.length > 0) {
          const selected = validTemplates[0];
          setSelectedTemplateId(selected._id);
          setWorkingHtml(getTemplateHtml(selected));
          setTemplateDetails({
            templateCode: selected.templateCode || "",
            templateName: selected.templateName || "",
            certificateType: selected.certificateType || "custom",
            title: selected.title || selected.templateName || "Certificate",
            status: selected.status || "draft",
          });
        }
      } catch (err) {
        console.error(
          "Failed to load certificate templates:",
          err
        );

        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load certificate templates."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load supported placeholders
   */
  useEffect(() => {
    let mounted = true;

    const loadPlaceholders = async () => {
      try {
        setLoadingPlaceholders(true);

        const response = await getTemplatePlaceholders();

        if (!mounted) return;

        setPlaceholders(response?.placeholders || []);
      } catch (err) {
        console.error(
          "Failed to load placeholders:",
          err
        );

        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load template placeholders."
        );
      } finally {
        if (mounted) {
          setLoadingPlaceholders(false);
        }
      }
    };

    loadPlaceholders();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Save template
   */
  const handleSave = async (htmlContent) => {
    if (!createMode && !selectedTemplate?._id) {
      throw new Error("Select a certificate template or create a new one.");
    }

    if (createMode && Object.values(templateDetails).some((value) => !value.trim())) {
      throw new Error("Complete the template code, name, certificate type, and title before saving.");
    }

    if (!htmlContent || !htmlContent.trim()) {
      throw new Error("Template HTML cannot be empty.");
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = createMode
        ? await createCertificateTemplate({ ...templateDetails, htmlContent })
        : await updateCertificateTemplate(selectedTemplate._id, { ...templateDetails, htmlContent });

      const updatedTemplate = response?.template;
      if (updatedTemplate) {
        setTemplates((currentTemplates) => createMode
          ? [updatedTemplate, ...currentTemplates]
          : currentTemplates.map((template) => template._id === updatedTemplate._id ? updatedTemplate : template));
        setSelectedTemplateId(updatedTemplate._id);
        setWorkingHtml(htmlContent);
        setCreateMode(false);
      }

      setIsDirty(false);
      setSuccess(createMode ? "Certificate template created." : "Certificate template saved.");
      return true;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Unable to save certificate template.";
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setSaving(false);
    }
  };

  const startNewTemplate = () => {
    if (isDirty && !window.confirm("Discard unsaved template changes?")) return;
    setTemplateDetails({ templateCode: "", templateName: "", certificateType: "custom", title: "Certificate", status: "draft" });
    setCreateMode(true);
    setWorkingHtml(starterHtml);
    setIsDirty(false);
    setEditorController(null);
    setPreviewMode(false);
    setError("");
    setSuccess("");
  };

  const handleTemplateChange = (event) => {
    if (isDirty && !window.confirm("Discard unsaved template changes?")) return;
    const id = event.target.value;
    setSelectedTemplateId(id);
    const nextTemplate = templates.find((template) => template._id === id);
    setWorkingHtml(getTemplateHtml(nextTemplate));
    if (nextTemplate) {
      setTemplateDetails({
        templateCode: nextTemplate.templateCode || "",
        templateName: nextTemplate.templateName || "",
        certificateType: nextTemplate.certificateType || "custom",
        title: nextTemplate.title || nextTemplate.templateName || "Certificate",
        status: nextTemplate.status || "draft",
      });
    }
    setCreateMode(false);
    setIsDirty(false);
    setEditorController(null);
    setError("");
    setSuccess("");
    setPreviewMode(false);
  };

  const handleEditorChange = (html) => {
    setWorkingHtml(html);
  };

  const handleEditorDirtyChange = (dirty) => {
    setIsDirty(dirty);
  };

  const handleEditorReady = (controller) => {
    setEditorController(controller);
  };

  /*
   * Generate preview HTML
   */
  const previewHtml = useMemo(() => {
    const html = createMode || isDirty ? workingHtml : getTemplateHtml(selectedTemplate);
    if (!html) {
      return "";
    }

    return replacePlaceholders(html);
  }, [createMode, isDirty, selectedTemplate, workingHtml]);

  /*
   * Loading state
   */
  if (loading) {
    return (
      <div
        className="certificate-template-editor-page certificate-template-page-loading"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <p role="status">Loading certificate templates…</p>
      </div>
    );
  }

  /*
   * Error state when templates could not load
   */
  if (error && templates.length === 0) {
    return (
      <div
        className="certificate-template-editor-page"
        style={{
          minHeight: "100vh",
          padding: "40px",
        }}
      >
        <h1>Certificate Template Editor</h1>

        <div className="certificate-template-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="certificate-template-editor-page"
      style={{
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              marginBottom: "8px",
            }}
          >
            {createMode ? "Create Certificate Template" : "Certificate Template Editor"}
          </h1>

          <p
            style={{
              margin: 0,
              opacity: 0.75,
            }}
          >
            Design, edit, preview, and save certificate templates on an A4
            landscape editor.
          </p>
        </div>

        <div className="certificate-template-header-actions">
        <button type="button" onClick={startNewTemplate}>
          Create Template
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode((value) => !value)}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid #64748b",
            cursor: "pointer",
          }}
        >
          {previewMode ? "Edit Template" : "Preview with sample data"}
        </button>
        </div>
      </div>

      {/* Error */}
      {error && <Toast type="error" message={error} />}
      {success && <Toast type="success" message={success} />}

      {/* Template selector */}
      <div
        style={{
          marginBottom: "20px",
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid #475569",
        }}
      >
        {!createMode && <>
          <label htmlFor="certificate-template" style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Select Certificate Template
          </label>
          <select id="certificate-template" value={selectedTemplateId} onChange={handleTemplateChange} style={{ width: "100%", maxWidth: "600px", padding: "10px", borderRadius: "8px" }}>
            {templates.map((template) => <option key={template._id} value={template._id}>{template.templateName} ({template.templateCode})</option>)}
          </select>
        </>}
        <div className="certificate-template-create-fields">
          {[
            ["templateCode", "Template code"],
            ["templateName", "Template name"],
            ["certificateType", "Certificate type"],
            ["title", "Display title"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input required value={templateDetails[name]} onChange={(event) => { setIsDirty(true); setTemplateDetails((current) => ({ ...current, [name]: event.target.value })); }} />
            </label>
          ))}
          <label>Status
            <select value={templateDetails.status} onChange={(event) => { setIsDirty(true); setTemplateDetails((current) => ({ ...current, status: event.target.value })); }}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        {!createMode && selectedTemplate && <small className="certificate-template-version">Current version: {selectedTemplate.version || 1}</small>}
      </div>

      {/* Main content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Editor / Preview */}
        <div
          style={{
            minWidth: 0,
            overflow: "auto",
            borderRadius: "10px",
            border: "1px solid #475569",
            padding: "16px",
          }}
        >
          {previewMode ? (
            <div>
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "16px",
                }}
              >
                Certificate Preview
              </h2>

              <div
                style={{
                  width: "1123px",
                  minHeight: "794px",
                  margin: "0 auto",
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <iframe
                  title="Certificate Preview"
                  srcDoc={previewHtml}
                  style={{
                    width: "1123px",
                    height: "794px",
                    border: "none",
                    display: "block",
                  }}
                />
              </div>
            </div>
          ) : (
            <CertificateTemplateEditor
              key={createMode ? "new-template" : selectedTemplate?._id || "new-template"}
              initialHtml={createMode ? starterHtml : getTemplateHtml(selectedTemplate)}
              onSave={handleSave}
              onChange={handleEditorChange}
              onDirtyChange={handleEditorDirtyChange}
              onEditorReady={handleEditorReady}
              saving={saving}
            />
          )}

          {saving && (
            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
              }}
            >
              Saving template...
            </p>
          )}
        </div>

        {/* Placeholder panel */}
        <aside
          style={{
            border: "1px solid #475569",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "18px",
            }}
          >
            Available Placeholders
          </h2>

          {loadingPlaceholders ? (
            <p>Loading placeholders...</p>
          ) : placeholders.length === 0 ? (
            <p>No placeholders available.</p>
          ) : (
            <ul
              style={{
                paddingLeft: "20px",
                marginBottom: 0,
              }}
            >
              {placeholders.map((placeholder) => (
                <li
                  key={placeholder}
                  style={{
                    marginBottom: "8px",
                    wordBreak: "break-word",
                  }}
                >
                  <button type="button" className="certificate-placeholder-button" disabled={!editorController || previewMode} onClick={() => editorController?.insertPlaceholder(placeholder)}>
                    <code>{placeholder}</code>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <hr
            style={{
              margin: "20px 0",
            }}
          />

          <h3
            style={{
              fontSize: "16px",
            }}
          >
            Sample Data
          </h3>

          <div
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            <div>
              <strong>Name:</strong>{" "}
              {SAMPLE_DATA.fullName}
            </div>

            <div>
              <strong>Intern Code:</strong>{" "}
              {SAMPLE_DATA.internCode}
            </div>

            <div>
              <strong>Domain:</strong>{" "}
              {SAMPLE_DATA.domain}
            </div>

            <div>
              <strong>Request:</strong>{" "}
              {SAMPLE_DATA.requestNumber}
            </div>

            <div>
              <strong>Issue Date:</strong>{" "}
              {SAMPLE_DATA.issueDate}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
