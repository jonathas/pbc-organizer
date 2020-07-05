import glob from "glob";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import Exif, { ExifImage } from "exif";
const listFilenames = promisify(glob);
const mkdir = promisify(fs.mkdir);
const moveFile = promisify(fs.rename);

export interface PBCOrganizerConfig {
    srcdir: string;
    outdir: string;
    brand: string;
    model?: string;
    filetype?: string;
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
            const images = await listFilenames(`${this.cfg.srcdir}${path.sep}*.${this.cfg.filetype || "jpg"}`, {});
            const filesList = await this.identifyFiles(images);
            if (filesList.length === 0) {
                console.log("No files were found");
                return;
            }
            await this.moveFilesToOutDir(filesList);
            console.log(`${filesList.length} files were moved to the outdir`);
        } catch (err) {
            console.error(err.message);
        }
    }

    private async identifyFiles(images: string[]): Promise<FilesListItem[]> {
        const filesList: FilesListItem[] = [];

        console.log("Finding files with Exif segment...");
        for (const img of images) {
            const exif = await this.getExifData(img);
            if (exif && exif.image.Make && exif.image.Make.toLowerCase() === this.cfg.brand.toLowerCase()) {
                filesList.push(this.getFilesListItem(img, exif));
            }
        }

        if (this.cfg.model) {
            return filesList.filter(fl => fl.model.toLowerCase() === this.cfg.model.toLowerCase());
        }

        return filesList;
    }

    private getExifData(image: string): Promise<Exif.ExifData> {
        return new Promise((resolve) => {
            new ExifImage({ image }, function(err, data) {
                if (err) {
                    // console.log(`Error on ${image}: ${err.message}`);
                }
                return resolve(data);
            });
        });
    }

    private getFilesListItem(img: string, exif: Exif.ExifData): FilesListItem {
        return {
            filename: img,
            brand: exif.image.Make,
            model: exif.image.Model || ""
        };
    }

    private async moveFilesToOutDir(filesList: FilesListItem[]): Promise<void> {
        await mkdir(this.cfg.outdir, { recursive: true });
        for (const img of filesList) {
            console.log(`Moving ${img.filename} to ${this.cfg.outdir}`);
            await moveFile(img.filename, `${this.cfg.outdir}${path.sep}${img.filename.split(path.sep).pop()}`);
        }
    }
}
