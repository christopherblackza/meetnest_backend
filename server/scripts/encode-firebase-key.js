const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('\n❌ Please provide the path to the service account JSON file.');
  console.error('Usage: npm run encode-firebase <path-to-service-account.json>\n');
  process.exit(1);
}

try {
  const absolutePath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`\n❌ File not found: ${absolutePath}\n`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf8');
  
  // Validate it's JSON
  try {
    JSON.parse(fileContent);
  } catch (e) {
    console.error('\n❌ The provided file is not valid JSON.\n');
    process.exit(1);
  }
  
  const base64Content = Buffer.from(fileContent).toString('base64');
  
  console.log('\n✅ Base64 Encoded Service Account:\n');
  console.log(base64Content);
  console.log('\n📋 Copy the string above and set it as FIREBASE_SERVICE_ACCOUNT in your .env file.\n');
  
} catch (error) {
  console.error('\n❌ Error processing file:', error.message, '\n');
  process.exit(1);
}
