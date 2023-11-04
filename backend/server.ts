import express from "express";
import multer from "multer";
import * as apiPackage from "./apiPackage";
import * as prismaCalls from "./prismaCalls";
import { Action } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import createModuleLogger from '../src/logger';

const logger = createModuleLogger('Express Server');

dotenv.config();

const port = 3000;
const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the "Frontend" directory
app.use(express.static('Frontend'));

const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

app.get('/upload-page', (req, res) => { // This is just for testing purposes
    res.sendFile(path.join(__dirname, '../Frontend/testwebsite.html'));
});

app.post('/package', upload.single('packageContent'), async (req, res) => {
    try {
        if (!req.file) {
            logger.info("No file provided in the upload.");
            return res.status(400).send('No file uploaded');
        }

        const metadata = await apiPackage.extractMetadataFromZip(req.file.buffer);
        const url = await apiPackage.getGithubUrlFromZip(req.file.buffer);
        const githubInfo = apiPackage.parseGitHubUrl(url); 

        if (!githubInfo) {
            logger.info("Invalid GitHub repository URL.");
            return res.status(400).send('Invalid GitHub repository URL.');
        }
        const { owner, repo } = githubInfo;
        const action = Action.CREATE;
        await prismaCalls.uploadMetadataToDatabase(metadata);
        await prismaCalls.createPackageHistoryEntry(metadata.ID, 1, action); // User id is 1 for now
        await apiPackage.calculateAndStoreGithubMetrics(owner, repo);

        // Uploading files to the bucket
        const s3Response = await apiPackage.uploadToS3(req.file.originalname, req.file.buffer);
        res.send(`File uploaded successfully to ${s3Response.Location}`);
    } catch (error) {
        if (error instanceof Error) {
            logger.info("S3 upload error: ", error.message);
            res.status(500).send(error.message);
        } else {
            logger.info("Internal Server Error");
            res.status(500).send("Internal Server Error");
        }
    }
});

app.post('/packages', async (req, res) => {
    try {
        await apiPackage.getPackages(req, res);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/packages/byName/:name', async (req, res) => {
    try {
        await apiPackage.getPackagesByName(req, res);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.post('/package/byRegEx', async (req, res) => {
    try {
        await apiPackage.getPackagesByRegEx(req, res);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Error handling middleware
app.use((err, res) => {
    console.error('Caught exception: ', err);
    res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
