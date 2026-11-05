/* =========================================================
   LEAGUE WINNER CERTIFICATE DATA
========================================================= */

const certificateData = {

    certificateNumber: "CERT-2026-00001",

    internName: "Intern Name",

    leagueName: "League Name",

    issueDate: "01 Apr 2026",

    place: "Jaipur",

    organizer: "UptoSkills",

    authorizedName: "Authorized Name",

    organizationName: "UptoSkills"

};


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

    const element = document.getElementById(id);

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
        "leagueName",
        certificateData.leagueName
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
        "organizer",
        certificateData.organizer
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

}


/* =========================================================
   UNIQUE QR CODE
========================================================= */

function generateQRCode() {

    const qrContainer =
        document.getElementById("qrcode");


    if (!qrContainer) {

        console.error(
            "QR container not found."
        );

        return;
    }


    if (typeof QRCode === "undefined") {

        console.error(
            "QRCode library not loaded."
        );

        return;
    }


    qrContainer.innerHTML = "";


    /*
       Every certificate gets a unique
       verification URL.

       Example:

       CERT-2026-00001

       becomes

       https://uptoskills.com/verify/CERT-2026-00001
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