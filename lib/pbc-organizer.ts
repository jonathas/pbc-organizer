import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
import Exif, { ExifImage } from "exif";

export interface PBCOrganizerConfig {
    srcdir: string;
    outdir: string;
    brand: string;
    model?: string;
    filetype?: string;
    mode?: string;
}

interface FilesListItem {
    filename: string;
    brand: string;
    model?: string;
}

export class PBCOrganizer {
    private cfg: PBCOrganizerConfig;

    public constructor(cfg: PBCOrganizerConfig) {
        this.cfg = cfg;
    }

    public async run(): Promise<void> {
        try {
            if (this.cfg.mode === "bydate") {
                const images = await glob(`${this.cfg.srcdir}${path.sep}*.{jpg,mov,mp4,png}`, {});
                await this.organizeByDate(images);
            } else {
                const images = await glob(`${this.cfg.srcdir}${path.sep}*.${this.cfg.filetype || "jpg"}`, {});
                await this.organizeByExif(images);
            }
        } catch (err) {
            console.error(err.message);
        }
    }

    private async organizeByDate(images: string[]) {
        console.log("Organizing by date...");

        for (const img of images) {
            const filename = path.basename(img);
            const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}/);
            
            if (dateMatch) {
                const date = dateMatch[0];
                const outDir = `${this.cfg.outdir}${path.sep}${date}`;
                await fs.mkdir(outDir, { recursive: true });
                await fs.rename(img, `${outDir}${path.sep}${filename}`);
            } else {
                console.log(`Invalid filename format for ${img}`);
            }
        }

        console.log(`${images.length} files were moved to the outdir`);
    }

    private async organizeByExif(images: string[]) {
        const filesList = await this.identifyFiles(images);

        if (filesList.length === 0) {
            console.log("No files were found");
            return;
        }

        await this.moveFilesToOutDir(filesList);
        console.log(`${filesList.length} files were moved to the outdir`);
    }

    private async identifyFiles(images: string[]): Promise<FilesListItem[]> {
        const filesList: FilesListItem[] = [];

        console.log("Finding files with Exif segment...");
        for (const img of images) {
            const exif = await this.getExifData(img);
            if (exif?.image?.Make && exif.image.Make.toLowerCase() === this.cfg.brand.toLowerCase()) {
                filesList.push(this.getFilesListItem(img, exif));
            }
        }

        if (this.cfg.model) {
            return filesList.filter(fl => (fl.model?.toLowerCase() ?? "") === (this.cfg.model?.toLowerCase() ?? ""));
        }

        return filesList;
    }

    private getExifData(image: string): Promise<Exif.ExifData> {
        return new Promise((resolve) => {
            return new ExifImage({ image }, function(err, data) {
                if (err) {
                    console.log(`Error on ${image}: ${err.message}`);
                }
                return resolve(data);
            });
        });
    }

    private getFilesListItem(img: string, exif: Exif.ExifData): FilesListItem {
        return {
            filename: img,
            brand: exif.image.Make || "",
            model: exif.image.Model || ""
        };
    }

    private async moveFilesToOutDir(filesList: FilesListItem[]): Promise<void> {
        await fs.mkdir(this.cfg.outdir, { recursive: true });
        for (const img of filesList) {
            console.log(`Moving ${img.filename} to ${this.cfg.outdir}`);
            await fs.rename(img.filename, `${this.cfg.outdir}${path.sep}${img.filename.split(path.sep).pop()}`);
        }
    }
}
