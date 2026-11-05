/* =========================================================
   OJT CERTIFICATE DATA
========================================================= */

const certificateData = {

    certificateNumber: "CERT-2026-OJT-00001",

    internName: "Intern Name",

    domain: "Web Development",

    startDate: "01 Jan 2026",

    endDate: "31 Mar 2026",

    issueDate: "01 Apr 2026",

    place: "Jaipur",

    mentorName: "Training Supervisor",

    hrName: "HR Manager",

    hrSignature: "Authorized",

    organizationName: "UptoSkills"

};


/* =========================================================
   AFTER HTML LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =================================================
           SET VALUE
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
           PARSE DATE
        ================================================= */

        function parseDate(value) {

            const parts =
                value.trim().split(/\s+/);

            if (parts.length !== 3) {
                return null;
            }

            const months = {

                Jan: 0,
                Feb: 1,
                Mar: 2,
                Apr: 3,
                May: 4,
                Jun: 5,
                Jul: 6,
                Aug: 7,
                Sep: 8,
                Oct: 9,
                Nov: 10,
                Dec: 11

            };

            const day =
                parseInt(parts[0], 10);

            const month =
                months[parts[1]];

            const year =
                parseInt(parts[2], 10);

            if (
                Number.isNaN(day) ||
                month === undefined ||
                Number.isNaN(year)
            ) {
                return null;
            }

            return new Date(
                year,
                month,
                day
            );
        }


        /* =================================================
           CALCULATE DURATION
        ================================================= */

        function calculateDuration(
            startValue,
            endValue
        ) {

            const start =
                parseDate(startValue);

            const end =
                parseDate(endValue);

            if (!start || !end) {
                return "Invalid Dates";
            }

            if (end < start) {
                return "Invalid Dates";
            }


            /*
                01 Jan → 31 Mar
                = 3 Months
            */

            const lastDay =
                new Date(
                    end.getFullYear(),
                    end.getMonth() + 1,
                    0
                ).getDate();


            if (
                start.getDate() === 1 &&
                end.getDate() === lastDay
            ) {

                const months =
                    (
                        end.getFullYear()
                        -
                        start.getFullYear()
                    ) * 12
                    +
                    (
                        end.getMonth()
                        -
                        start.getMonth()
                    )
                    + 1;

                return months === 1
                    ? "1 Month"
                    : `${months} Months`;
            }


            /* Normal calculation */

            let months =
                (
                    end.getFullYear()
                    -
                    start.getFullYear()
                ) * 12
                +
                (
                    end.getMonth()
                    -
                    start.getMonth()
                );


            let days =
                end.getDate()
                -
                start.getDate();


            if (days < 0) {

                months--;

                const previousMonthDays =
                    new Date(
                        end.getFullYear(),
                        end.getMonth(),
                        0
                    ).getDate();

                days += previousMonthDays;
            }


            if (
                months > 0 &&
                days > 0
            ) {

                return `${months} Months ${days} Days`;
            }


            if (months > 0) {

                return months === 1
                    ? "1 Month"
                    : `${months} Months`;
            }


            return days === 1
                ? "1 Day"
                : `${days} Days`;
        }


        /* =================================================
           DURATION
        ================================================= */

        const duration =
            calculateDuration(
                certificateData.startDate,
                certificateData.endDate
            );


        /* =================================================
           INSERT DATA
        ================================================= */

        setValue(
            "certificateNumber",
            certificateData.certificateNumber
        );

        setValue(
            "internName",
            certificateData.internName
        );

        setValue(
            "domain",
            certificateData.domain
        );

        setValue(
            "startDate",
            certificateData.startDate
        );

        setValue(
            "endDate",
            certificateData.endDate
        );

        setValue(
            "duration",
            duration
        );

        setValue(
            "issueDate",
            certificateData.issueDate
        );

        setValue(
            "place",
            certificateData.place
        );

        setValue(
            "mentorName",
            certificateData.mentorName
        );

        setValue(
            "hrName",
            certificateData.hrName
        );

        setValue(
            "hrSignature",
            certificateData.hrSignature
        );

        setValue(
            "organizationName",
            certificateData.organizationName
        );


        /* =================================================
           QR CODE
        ================================================= */

        function generateQR() {

            const container =
                document.getElementById(
                    "qrcode"
                );

            if (!container) {

                console.error(
                    "QR container not found."
                );

                return;
            }

            container.innerHTML = "";


            const verificationURL =
                "https://uptoskills.com/verify/"
                +
                encodeURIComponent(
                    certificateData
                        .certificateNumber
                );


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
                container,
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
                "QR URL:",
                verificationURL
            );
        }


        generateQR();


        console.log(
            "OJT Certificate generated.",
            certificateData
        );

    }
);