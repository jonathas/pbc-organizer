# Photo by Camera Organizer

## Introduction

If you, like me, live in a household where there is more than one model of camera or mobile phone, you might end up with photos from all these cameras mixed up in just one place.

This can happen, among other reasons, if for example:

- Both you and other people in your family use the same Dropbox account and all devices sync photos to the Camera Uploads directory on Dropbox automatically

- You receive photos that friends took of you / for you in some party and they get all mixed up in some directory.

- You have more than one camera model that you own and would like to organize photos by camera in different directories.

Using the Photo by Camera Organizer script, you're able to identify which of the photos in a specific directory were taken by your friend's camera, then automatically move them to a separate directory so they can be better organized.

## Configuration

Download this source code, enter its directory via the terminal and run:

```bash
npm i
```

to install the required packages

## Usage

The following parameters can be passed to the script:

___________________

| Command        | Result |
| ------------- |:-------------:|
| srcdir    | The directory path where your photos are located |
| outdir  | The directory where you want to save the selected photos (the script will create it if it doesn't exist yet) |
| brand | The brand of the camera. Examples: samsung, xiaomi     |
| model | Optional. The specific model of the camera, in case you have more than one camera with the same brand |
| filetype | Optional. If your photos are not in jpg, specify the filetype. Examples: png, gif, jpeg |
___________________

Run it with ts-node. Examples:

```
ts-node index.ts --brand=samsung --srcdir=/Users/jon/Desktop --outdir="/Users/jon/Desktop/mydir with spaces" --model=SM-G973F
```

```
ts-node index.ts --brand=xiaomi --srcdir=/Users/jon/Desktop --outdir="/Users/jon/Desktop/mydir xiaomi photos" --filetype=png
```

```
ts-node index.ts --brand=xiaomi --srcdir=/Users/jon/Desktop --outdir=/Users/jon/Desktop/mydir
```

## Known limitations

- The script won't be able to identify screenshots, as they don't have exif data about a camera. They weren't taken by a camera anyway.

- The script won't be able to identify videos, as they don't have exif data.
