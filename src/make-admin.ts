import { addAdminEmail, findUserByEmail } from "./storage"

const email = process.argv[2]

if (!email) {
  console.log("Usage: node dist/make-admin.js <registered-email>")
  process.exit(1)
}

const user = findUserByEmail(email)

if (!user) {
  console.log("No registered user found with this email. The user must register on the website first.")
  process.exit(1)
}

addAdminEmail(email)

console.log(`Admin access granted for: ${user.email}`)
console.log("The change takes effect immediately (no server restart needed).")
console.log("To revoke, remove the email from data/admins.json.")
