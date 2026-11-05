import xlsx from "xlsx";
import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";

await connectToDB();

function parseDate(value) {
    if (!value) return null;

    // Excel serial date
    if (typeof value === "number") {
        return new Date((value - 25569) * 86400 * 1000);
    }

    // DD/MM/YYYY format
    if (typeof value === "string") {
        const [day, month, year] = value.split("/");

        if (!day || !month || !year) {
            return null;
        }

        return new Date(year, month - 1, day);
    }

    return null;
}

try {
    const workbook = xlsx.readFile("../data/interns.xlsx");

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const interns = xlsx.utils.sheet_to_json(sheet, {
        range: 1
    });

    console.log(interns[0]);
    console.log(`Found ${interns.length} interns`);

    for (const intern of interns) {
        try {
            console.log("Processing:", intern);

            // Skip empty or invalid rows
            if (
                !intern["Full Name"] ||
                !intern["Email ID"] ||
                !intern["Intern Code"]
            ) {
                console.log("Skipping invalid row:", intern);
                continue;
            }

            const email = String(intern["Email ID"]).trim();

            const existingUser = await User.findOne({
                email
            });

            if (existingUser) {
                console.log(`Skipped: ${email}`);
                continue;
            }

            await User.create({
                fullName: String(intern["Full Name"]).trim(),
                email,
                mobileNo: String(intern["Mobile No."] || ""),
                internCode: String(intern["Intern Code"]).trim(),
                domain: intern["Domain"] || "",

                startDate: parseDate(intern["Start Date"]),
                endDate: parseDate(intern["End Date"]),

                password: String(intern["Intern Code"]).trim(),

                role: "intern"
            });

            console.log(`Inserted: ${intern["Full Name"]}`);
        } catch (err) {
            console.error(
                `Error processing ${intern["Email ID"] || "unknown row"}:`,
                err.message
            );
        }
    }

    console.log("Import completed");

    process.exit(0);
} catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
}
