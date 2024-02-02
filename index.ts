import { argv } from "yargs";
import { PBCOrganizer } from "./lib/pbc-organizer";

if (!argv.brand || !argv.srcdir || !argv.outdir) {
    console.error("Please inform all the required parameters: brand, srcdir, outdir");
    process.exit(0);
}

const pbc = new PBCOrganizer(argv);
pbc.run();
