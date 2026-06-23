const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER) {
    console.log(`📧 Email simulé (SMTP non configuré) → ${to} | Sujet: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`📧 Email envoyé → ${to} | Sujet: ${subject}`);
  } catch (err) {
    console.error(`📧 Échec envoi email → ${to}:`, err.message);
  }
};

const emailTemplates = {
  registrationReceived: (companyName, ownerName) => ({
    subject: '📋 Votre demande d\'inscription SmartStock Guinée est en cours de traitement',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h1 style="color:#2563eb">Demande reçue !</h1>
        <p>Bonjour <strong>${ownerName}</strong>,</p>
        <p>Nous avons bien reçu la demande d'inscription de <strong>${companyName}</strong>.</p>
        <p>Votre dossier est en cours d'examen par notre équipe. Vous recevrez un email de confirmation
           dès que votre compte aura été validé (généralement sous 24 à 48 heures).</p>
        <div style="background:#f1f5f9;border-left:4px solid #2563eb;padding:12px 16px;margin:20px 0;border-radius:4px">
          <p style="margin:0;color:#475569;font-size:14px">
            En attendant, conservez cet email. Il confirme que votre demande a bien été prise en compte.
          </p>
        </div>
        <p>Si vous avez des questions, n'hésitez pas à contacter notre support.</p>
        <p style="color:#666;margin-top:24px">L'équipe SmartStock Guinée</p>
      </div>
    `,
  }),

  accountApproved: (companyName) => ({
    subject: '✅ Votre compte SmartStock Guinée a été approuvé !',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h1 style="color:#16a34a">Félicitations !</h1>
        <p>Bonjour <strong>${companyName}</strong>,</p>
        <p>Votre compte SmartStock Guinée a été <strong>approuvé et activé</strong>.</p>
        <p>Vous pouvez maintenant vous connecter et gérer votre boutique.</p>
        <a href="${process.env.FRONTEND_URL}/login"
           style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px">
          Se connecter
        </a>
        <p style="color:#666;margin-top:24px">L'équipe SmartStock Guinée</p>
      </div>
    `,
  }),

  accountRejected: (companyName, reason) => ({
    subject: '❌ Demande de compte SmartStock Guinée refusée',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h1 style="color:#dc2626">Demande refusée</h1>
        <p>Bonjour <strong>${companyName}</strong>,</p>
        <p>Votre demande d'inscription a été refusée pour la raison suivante :</p>
        <blockquote style="border-left:4px solid #dc2626;padding-left:16px;color:#555">
          ${reason}
        </blockquote>
        <p>Pour toute question, contactez notre support.</p>
        <p style="color:#666;margin-top:24px">L'équipe SmartStock Guinée</p>
      </div>
    `,
  }),

  accountSuspended: (companyName) => ({
    subject: '⚠️ Votre compte SmartStock Guinée a été suspendu',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h1 style="color:#d97706">Compte suspendu</h1>
        <p>Bonjour <strong>${companyName}</strong>,</p>
        <p>Votre compte SmartStock Guinée a été <strong>temporairement suspendu</strong>.</p>
        <p>Vous ne pouvez plus accéder à la plateforme jusqu'à la levée de la suspension.</p>
        <p>Pour connaître la raison de cette suspension ou la contester, veuillez contacter notre support.</p>
        <p style="color:#666;margin-top:24px">L'équipe SmartStock Guinée</p>
      </div>
    `,
  }),

  accountReactivated: (companyName) => ({
    subject: '✅ Votre compte SmartStock Guinée a été réactivé',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h1 style="color:#16a34a">Compte réactivé !</h1>
        <p>Bonjour <strong>${companyName}</strong>,</p>
        <p>Votre compte SmartStock Guinée a été <strong>réactivé</strong>. Vous pouvez de nouveau accéder à la plateforme.</p>
        <a href="${process.env.FRONTEND_URL}/login"
           style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px">
          Se connecter
        </a>
        <p style="color:#666;margin-top:24px">L'équipe SmartStock Guinée</p>
      </div>
    `,
  }),

  passwordReset: (resetUrl) => ({
    subject: '🔑 Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h1 style="color:#2563eb">Réinitialisation du mot de passe</h1>
        <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}"
           style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px">
          Réinitialiser le mot de passe
        </a>
        <p style="color:#666;margin-top:16px">Ce lien expire dans 1 heure.</p>
        <p style="color:#666">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
