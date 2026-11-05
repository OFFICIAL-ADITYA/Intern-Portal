/* =====================================================
   OFFER LETTER DATA
===================================================== */

const offerData = {

    issueDate: "01 Apr 2026",

    offerNumber: "OFF-2026-00001",

    internName: "Intern Name",

    organizationName: "UptoSkills",

    position: "Web Development Intern",

    department: "Web Development",

    startDate: "01 Apr 2026",

    endDate: "30 Jun 2026",

    duration: "3 Months",

    mode: "Hybrid",

    location: "Jaipur",

    stipend: "₹5,000 / Month",

    reportingManager: "Manager Name",

    authorizedPerson: "Authorized Person",

    authorizedPosition: "HR Manager"

};


/* =====================================================
   SET ELEMENT TEXT
===================================================== */

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


/* =====================================================
   LOAD DATA
===================================================== */

function loadOfferData() {

    setText(
        "issueDate",
        offerData.issueDate
    );

    setText(
        "offerNumber",
        offerData.offerNumber
    );

    setText(
        "internName",
        offerData.internName
    );

    setText(
        "organizationName",
        offerData.organizationName
    );

    setText(
        "termsOrganization",
        offerData.organizationName
    );

    setText(
        "closingOrganization",
        offerData.organizationName
    );

    setText(
        "signatureOrganization",
        offerData.organizationName
    );

    setText(
        "position",
        offerData.position
    );

    setText(
        "department",
        offerData.department
    );

    setText(
        "startDate",
        offerData.startDate
    );

    setText(
        "endDate",
        offerData.endDate
    );

    setText(
        "duration",
        offerData.duration
    );

    setText(
        "mode",
        offerData.mode
    );

    setText(
        "location",
        offerData.location
    );

    setText(
        "stipend",
        offerData.stipend
    );

    setText(
        "reportingManager",
        offerData.reportingManager
    );

    setText(
        "authorizedPerson",
        offerData.authorizedPerson
    );

    setText(
        "authorizedPosition",
        offerData.authorizedPosition
    );

}


/* =====================================================
   GENERATE UNIQUE QR
===================================================== */

function generateQRCode() {

    const qrContainer =
        document.getElementById("qrcode");

    if (!qrContainer) {
        console.error("QR container not found.");
        return;
    }


    if (typeof QRCode === "undefined") {

        console.error(
            "QRCode library was not loaded."
        );

        return;
    }


    qrContainer.innerHTML = "";


    /*
       Every offer gets a different QR
       based on its Offer Number.
    */

    const verificationURL =
        "https://uptoskills.com/verify/offer/" +
        encodeURIComponent(
            offerData.offerNumber
        );


    new QRCode(

        qrContainer,

        {
            text: verificationURL,

            width: 68,
            height: 68,

            colorDark: "#000000",

            colorLight: "#ffffff",

            correctLevel:
                QRCode.CorrectLevel.H

        }

    );

}


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadOfferData();

        generateQRCode();

    }
);