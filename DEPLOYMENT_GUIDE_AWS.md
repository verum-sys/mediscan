# Deployment Guide (AWS DynamoDB)

You have successfully migrated your database from Supabase to **AWS DynamoDB**.

## 1. Environment Variables
You must add the following Environment Variables to your Vercel Project Settings:

| Key | Value |
|-----|-------|
| `AWS_ACCESS_KEY_ID` | `REDACTED_AWS_ACCESS_KEY` |
| `AWS_SECRET_ACCESS_KEY` | `REDACTED_AWS_SECRET_KEY` |
| `AWS_REGION` | `us-east-1` |
| `LLM_API_KEY` | (Your Cerebras/LLM Key) |

## 2. Database Setup
The database tables have been created automatically using the `setup_dynamodb.js` script.
If you ever need to recreate them, run:
```bash
node setup_dynamodb.js
```

## 3. Verify
Once deployed, your application will now read and write to DynamoDB.
- **Visits**: Stored in `Visits` table.
- **Symptoms**: Stored in `Symptoms` table.
- **Search**: Will scan the `Visits` table.

## 4. Note on File Uploads
Currently, file uploads (PDFs/Images) are processed in memory. If you want to persist the actual files, we should add an S3 bucket integration. For now, the **metadata and extracted text** are stored in DynamoDB.
