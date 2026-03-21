const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const CONTACT_FORM_ID = process.env.HUBSPOT_CONTACT_FORM_ID;
const NEWSLETTER_FORM_ID = process.env.HUBSPOT_NEWSLETTER_FORM_ID;

export default async (req) => {
  const body = await req.json();
  const formName = body.form_name;
  const data = body.data || {};

  let hubspotFormId;
  let fields;

  if (formName === 'contact') {
    hubspotFormId = CONTACT_FORM_ID;
    fields = [
      { name: 'full_name', value: data.name || '' },
      { name: 'email', value: data.email || '' },
      { name: 'company', value: data.organization || '' },
      { name: 'jobtitle', value: data.role || '' },
      { name: 'message', value: data.message || '' },
      { name: 'identity', value: data.identity || '' },
    ];
  } else if (formName === 'newsletter') {
    hubspotFormId = NEWSLETTER_FORM_ID;
    fields = [
      { name: 'email', value: data.email || '' },
    ];
  } else {
    return new Response('Unknown form', { status: 400 });
  }

  const res = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${hubspotFormId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );

  return new Response(JSON.stringify({ status: res.status }), { status: 200 });
};
