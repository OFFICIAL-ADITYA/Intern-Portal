/* =========================================================
   BONAFIDE CERTIFICATE DATA
========================================================= */

const certificateData = {

    certificateNumber: "CERT-2026-00001",

    studentName: "Student Name",

    organizationName: "UptoSkills",

    programName: "B.Tech Computer Science",

    departmentName:
        "Computer Science & Engineering",

    academicYear: "2025-2026",

    purpose: "Academic Purpose",

    issueDate: "01 Apr 2026",

    place: "Jaipur",

    authorizedName: "Authorized Name",

    designation: "HR Manager"

};


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value){

    const element =
        document.getElementById(id);

    if(element){

        element.textContent = value;

    }

}


/* =========================================================
   INSERT DATA
========================================================= */

setText(
    "certificateNumber",
    certificateData.certificateNumber
);


setText(
    "studentName",
    certificateData.studentName
);


setText(
    "organizationName",
    certificateData.organizationName
);


setText(
    "programName",
    certificateData.programName
);


setText(
    "departmentName",
    certificateData.departmentName
);


setText(
    "academicYear",
    certificateData.academicYear
);


setText(
    "purpose",
    certificateData.purpose
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
    "authorizedName",
    certificateData.authorizedName
);


setText(
    "designation",
    certificateData.designation
);


setText(
    "organizationBottom",
    certificateData.organizationName
);


/* =========================================================
   GENERATE UNIQUE QR
========================================================= */

function generateQRCode(){

    const qrContainer =
        document.getElementById("qrcode");


    if(!qrContainer){

        console.error(
            "QR container not found."
        );

        return;

    }


    qrContainer.innerHTML = "";


    if(typeof QRCode === "undefined"){

        console.error(
            "QRCode library not loaded."
        );

        return;

    }


    const verificationURL =
        "https://uptoskills.com/verify/" +
        encodeURIComponent(
            certificateData.certificateNumber
        );


    new QRCode(

        qrContainer,

        {

            text: verificationURL,

            width:84,

            height:84,

            colorDark:"#000000",

            colorLight:"#ffffff",

            correctLevel:
                QRCode.CorrectLevel.H

        }

    );

}


/* =========================================================
   RUN
========================================================= */

if(
    document.readyState === "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        generateQRCode
    );

}
else{

    generateQRCode();

}