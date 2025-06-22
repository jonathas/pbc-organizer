import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
import dayjs from "dayjs";
import sharp from "sharp";
import exifReader from "exif-reader";
import ffmpeg from "fluent-ffmpeg";

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
    private readonly cfg: PBCOrganizerConfig;

    private readonly extensions = "jpg,png,heic,mov,mp4";

    private readonly dateRegex = /^\d{4}-\d{2}-\d{2}/;

    public constructor(cfg: PBCOrganizerConfig) {
        this.cfg = cfg;
    }

    public async run(): Promise<void> {
        try {
            await this.renameAllToDateTime();

            if (this.cfg.mode === "bydate") {
                const images = await glob(`${this.cfg.srcdir}${path.sep}*.{${this.extensions}}`, {});
                await this.organizeByDate(images);
            } else {
                // Default mode is by camera brand
                const images = await glob(`${this.cfg.srcdir}${path.sep}*.${this.cfg.filetype || "jpg"}`, {});
                await this.organizeByExif(images);
            }
        } catch (err) {
            console.error(err.message);
        }
    }

    private async renameAllToDateTime() {
        const files = await glob(`${this.cfg.srcdir}${path.sep}*.{${this.extensions}}`, {});
        const filesNotStartingWithDate = files.filter(file => !RegExp(this.dateRegex).exec(path.basename(file)));

        if (!filesNotStartingWithDate.length) {
            return;
        }

        console.log("Renaming all files to date-time format...");

        for (const file of filesNotStartingWithDate) {
            const exifData = await this.getExifData(file);
            const dateTimeOriginal = exifData?.Photo?.DateTimeOriginal || exifData?.DateTimeOriginal;
            const dateTime = dayjs(dateTimeOriginal).format('YYYY-MM-DD HH.mm.ss');

            let newFileName = `${dateTime}${path.extname(file).toLocaleLowerCase()}`;
            let newFilePath = `${path.dirname(file)}${path.sep}${newFileName}`;
            let counter = 1;
            while (await this.fileExists(newFilePath)) {
                newFileName = `${dateTime} (${counter})${path.extname(file).toLocaleLowerCase()}`;
                newFilePath = `${path.dirname(file)}${path.sep}${newFileName}`;
                counter++;
            }
            await fs.rename(file, newFilePath);

            console.log(`Renamed ${path.basename(file)} to ${newFileName}`);
        }

        console.log(`${filesNotStartingWithDate.length} files were renamed`);
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async organizeByDate(images: string[]) {
        console.log("Organizing by date...");

        for (const img of images) {
            const filename = path.basename(img);
            const dateMatch = RegExp(this.dateRegex).exec(filename);

            if (dateMatch) {
                const date = dateMatch[0];
                const outDir = `${this.cfg.outdir}${path.sep}${date}`;

                if (!(await this.dirExists(outDir))) {
                    await fs.mkdir(outDir, { recursive: true });
                }
                await fs.rename(img, `${outDir}${path.sep}${filename}`);
            } else {
                console.log(`Invalid filename format for ${img}`);
            }
        }

        console.log(`${images.length} files were moved to the outdir`);
    }

    private async dirExists(dir: string): Promise<boolean> {
        try {
            await fs.access(dir);
            return true;
        } catch (err) {
            return false;
        }
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
            if (exif?.Photo?.Make && exif.Photo.Make.toLowerCase() === this.cfg.brand.toLowerCase()) {
                filesList.push(this.getFilesListItem(img, exif));
            }
        }

        if (this.cfg.model) {
            return filesList.filter(fl => (fl.model?.toLowerCase() ?? "") === (this.cfg.model?.toLowerCase() ?? ""));
        }

        return filesList;
    }

    private async getExifData(file: string): Promise<any> {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.mov' || ext === '.mp4') {
            return this.getVideoMetadata(file);
        } else {
            const buffer = await fs.readFile(file);
            const metadata = await sharp(buffer).metadata();
            return metadata.exif ? exifReader(metadata.exif) : null;
        }
    }

    private getVideoMetadata(file: string): Promise<any> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(file, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const creationTime = metadata.format.tags?.creation_time;
                    resolve({ DateTimeOriginal: creationTime });
                }
            });
        });
    }

    private getFilesListItem(img: string, exif: any): FilesListItem {
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
