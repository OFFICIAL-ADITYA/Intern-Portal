/* =========================================================
   EXPERIENCE LETTER DATA
========================================================= */

const experienceData = {

    certificateNumber: "EXP-2026-00001",

    internName: "Intern Name",

    organizationName: "UptoSkills",

    internPosition: "Web Development Intern",

    domain: "Web Development",

    startDate: "01 Jan 2026",

    endDate: "31 Mar 2026",

    issueDate: "01 Apr 2026",

    place: "Jaipur",

    managerName: "Reporting Manager",

    hrSignature: "Authorized"

};


/* =========================================================
   AFTER PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =================================================
           SET TEXT
        ================================================= */

        function setValue(id, value) {

            const element =
                document.getElementById(id);

            if (!element) {

                console.warn(
                    "Element not found:",
                    id
                );

                return;
            }

            element.textContent = value;
        }


        /* =================================================
           INSERT DATA
        ================================================= */

        setValue(
            "certificateNumber",
            experienceData.certificateNumber
        );

        setValue(
            "internName",
            experienceData.internName
        );

        setValue(
            "organizationInline",
            experienceData.organizationName
        );

        setValue(
            "organizationName",
            experienceData.organizationName
        );

        setValue(
            "internPosition",
            experienceData.internPosition
        );

        setValue(
            "domain",
            experienceData.domain
        );

        setValue(
            "startDate",
            experienceData.startDate
        );

        setValue(
            "endDate",
            experienceData.endDate
        );

        setValue(
            "issueDate",
            experienceData.issueDate
        );

        setValue(
            "place",
            experienceData.place
        );

        setValue(
            "managerName",
            experienceData.managerName
        );

        setValue(
            "hrSignature",
            experienceData.hrSignature
        );


        /* =================================================
           GENERATE UNIQUE QR
        ================================================= */

        const qrContainer =
            document.getElementById("qrcode");


        if (!qrContainer) {

            console.error(
                "QR container not found."
            );

            return;
        }


        qrContainer.innerHTML = "";


        const verificationURL =
            "https://uptoskills.com/verify/"
            +
            encodeURIComponent(
                experienceData.certificateNumber
            );


        if (
            typeof QRCode ===
            "undefined"
        ) {

            console.error(
                "QRCode library was not loaded."
            );

            return;
        }


        new QRCode(
            qrContainer,
            {

                text:
                    verificationURL,

                width: 86,

                height: 86,

                colorDark:
                    "#000000",

                colorLight:
                    "#ffffff",

                correctLevel:
                    QRCode
                    .CorrectLevel
                    .H

            }
        );


        console.log(
            "Experience Letter generated."
        );

        console.log(
            "Verification URL:",
            verificationURL
        );

    }
);