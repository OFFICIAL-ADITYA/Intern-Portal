/* =========================================================
   INTERN OF THE MONTH DATA
========================================================= */

const certificateData = {

    certificateNumber: "CERT-2026-00001",

    internName: "Intern Name",

    domain: "Web Development",

    month: "March",

    year: "2026",

    issueDate: "01 Apr 2026",

    place: "Jaipur",

    managerName: "Manager Name",

    authorizedName: "Authorized Name",

    organizationName: "UptoSkills"

};


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================================================
   LOAD DATA
========================================================= */

function loadCertificateData() {

    setText(
        "certificateNumberText",
        certificateData.certificateNumber
    );

    setText(
        "internName",
        certificateData.internName
    );

    setText(
        "issueDate",
        certificateData.issueDate
    );

    setText(
        "place",
        certificateData.place
    );

    setText(
        "managerName",
        certificateData.managerName
    );

    setText(
        "signature",
        certificateData.authorizedName
    );

    setText(
        "authorizedName",
        certificateData.authorizedName
    );

    setText(
        "organizationName",
        certificateData.organizationName
    );


    /*
       Replace placeholders in the normal HTML text.
    */

    document.body.innerHTML =
        document.body.innerHTML
            .replace(
                /\{\{Domain\}\}/g,
                certificateData.domain
            )
            .replace(
                /\{\{Month\}\}/g,
                certificateData.month
            )
            .replace(
                /\{\{Year\}\}/g,
                certificateData.year
            );

}


/* =========================================================
   GENERATE UNIQUE QR
========================================================= */

function generateQRCode() {

    const qrContainer =
        document.getElementById("qrcode");

    if (!qrContainer) {
        return;
    }

    if (typeof QRCode === "undefined") {

        console.error(
            "QRCode library is not loaded."
        );

        return;
    }

    qrContainer.innerHTML = "";


    /*
       Every certificate gets a different
       verification URL based on certificate number.
    */

    const verificationURL =
        "https://uptoskills.com/verify/" +
        encodeURIComponent(
            certificateData.certificateNumber
        );


    new QRCode(

        qrContainer,

        {
            text: verificationURL,

            width: 86,

            height: 86,

            colorDark: "#000000",

            colorLight: "#ffffff",

            correctLevel:
                QRCode.CorrectLevel.H
        }

    );

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadCertificateData();

        generateQRCode();

    }
);