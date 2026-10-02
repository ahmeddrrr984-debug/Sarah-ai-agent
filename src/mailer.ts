import nodemailer from "nodemailer"

export type InterestApplication = {
  fullName: string
  phone: string
  email: string
  university: string
  faculty: string
  academicYear: string
  request: string
  role?: string
  skills?: string
  notes?: string
}

export function isMailerConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

export async function sendInterestEmail(application: InterestApplication): Promise<void> {
  const port = Number(process.env.SMTP_PORT)

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  const to = process.env.INTEREST_EMAIL_TO || "sarahyouthscienceclub@gmail.com"
  const subject = `New YSC Interest/Application - ${application.fullName} - ${application.request}`

  const lines = [
    `Name: ${application.fullName}`,
    `Phone: ${application.phone}`,
    `Email: ${application.email}`,
    `University: ${application.university}`,
    `Faculty: ${application.faculty}`,
    `Academic year: ${application.academicYear}`,
    `Request: ${application.request}`
  ]

  if (application.role) {
    lines.push(`Committee/Role: ${application.role}`)
  }
  if (application.skills) {
    lines.push(`Skills/Experience: ${application.skills}`)
  }
  if (application.notes) {
    lines.push(`Additional message: ${application.notes}`)
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text: lines.join("\n")
  })
}
