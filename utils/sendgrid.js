const weeklyRoundUpEmailId = '20d651d6-8b8e-455c-bd34-a293b8582217';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

const sgMail = require('@sendgrid/mail');
const moment = require('moment');

sgMail.setApiKey(SENDGRID_API_KEY);

const msg = {
  to: 'trevor.frese@gmail.com',
  from: 'trevor.frese@gmail.com',
  subject: `Discover Local Music ${moment().format('L')}`,
  template_id: weeklyRoundUpEmailId
};

try {
  sgMail.send(msg);
  console.log('done');
} catch (err) {
  console.log(err);
}
