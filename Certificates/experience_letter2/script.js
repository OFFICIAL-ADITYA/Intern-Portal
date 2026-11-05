/* =========================================================
   INTERNSHIP EXPERIENCE LETTER DATA
========================================================= */

const letterData = {

    referenceID: "EXP-2026-00001",

    issueDate: "01 Apr 2026",

    internName: "Intern Name",

    organizationName: "UptoSkills",

    position: "Web Development Intern",

    department: "Software Development",

    startDate: "01 Jan 2026",

    endDate: "31 Mar 2026",

    duration: "3 Months",

    domain: "Web Development",

    workMode: "Work From Home",

    reportingManager: "Reporting Manager",

    authorizedPersonName: "Authorized Person",

    designation: "HR Manager",

    authorizedSignature: "Authorized",

    companyEmail: "hr@uptoskills.com",

    companyPhone: "+91 XXXXX XXXXX",

    companyWebsite: "www.uptoskills.com",

    companyAddress: "Jaipur, Rajasthan",

    verificationURL:
        "https://uptoskills.com/verify/EXP-2026-00001"

};


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* ================================================
           HELPER
        ================================================= */

        function setText(id, value) {

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


        /* ================================================
           BASIC DATA
        ================================================= */

        setText(
            "referenceId",
            letterData.referenceID
        );

        setText(
            "issueDate",
            letterData.issueDate
        );

        setText(
            "internName",
            letterData.internName
        );

        setText(
            "internName2",
            letterData.internName
        );

        setText(
            "internName3",
            letterData.internName
        );

        setText(
            "organizationName",
            letterData.organizationName
        );

        setText(
            "position",
            letterData.position
        );

        setText(
            "department",
            letterData.department
        );

        setText(
            "startDate",
            letterData.startDate
        );

        setText(
            "endDate",
            letterData.endDate
        );

        setText(
            "duration",
            letterData.duration
        );

        setText(
            "domain",
            letterData.domain
        );

        setText(
            "duration2",
            letterData.startDate
        );

        setText(
            "endDate2",
            letterData.endDate
        );

        setText(
            "workMode",
            letterData.workMode
        );

        setText(
            "reportingManager",
            letterData.reportingManager
        );

        setText(
            "authorizedPersonName",
            letterData.authorizedPersonName
        );

        setText(
            "designation",
            letterData.designation
        );

        setText(
            "authorizedSignature",
            letterData.authorizedSignature
        );

        setText(
            "companyEmail",
            letterData.companyEmail
        );

        setText(
            "companyPhone",
            letterData.companyPhone
        );

        setText(
            "companyWebsite",
            letterData.companyWebsite
        );

        setText(
            "companyAddress",
            letterData.companyAddress
        );

        setText(
            "verificationText",
            letterData.verificationURL
        );


        /* ================================================
           QR CODE
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


        if (
            typeof QRCode ===
            "undefined"
        ) {

            console.error(
                "QRCode library not loaded."
            );

            return;
        }


        new QRCode(
            qrContainer,
            {

                text:
                    letterData.verificationURL,

                width: 82,

                height: 82,

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
            "Internship Experience Letter generated."
        );

        console.log(
            "Reference ID:",
            letterData.referenceID
        );

        console.log(
            "QR:",
            letterData.verificationURL
        );

    }
);