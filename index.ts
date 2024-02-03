import { argv } from "yargs";
import { PBCOrganizer } from "./lib/pbc-organizer";

if (argv.mode && argv.mode === "bydate") {
    if (!argv.srcdir || !argv.outdir) {
        console.error("Please inform the source and output directories");
        process.exit(0);
    }
} else if (argv.mode && argv.mode !== "bydate") {
    console.error("Invalid mode. Please inform 'bydate' or nothing");
    process.exit(0);
}

if (!argv.mode && (!argv.brand || !argv.srcdir || !argv.outdir)) {
    console.error("Please inform all the required parameters: brand, srcdir, outdir");
    process.exit(0);
}

const pbc = new PBCOrganizer(argv);
pbc.run();
