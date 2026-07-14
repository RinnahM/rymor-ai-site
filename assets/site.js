/* =========================================================================
   RYMOR AI — SHARED BEHAVIOR
   Linked from every page (index.html, case-*.html, cert-*.html): theme
   toggle, marquee, scroll reveal, custom cursor, the chat widget, and the
   contact form handler. Every selector is guarded with an existence check
   so this same file works whether or not a given page has that element.
   ========================================================================= */

/* -------------------------------------------------------------------------
   THEME TOGGLE (persisted in localStorage, shared across every page)
------------------------------------------------------------------------- */
(function initTheme(){
  const root = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');
  const iconSun = document.getElementById('iconSun');
  const iconMoon = document.getElementById('iconMoon');
  if(!toggleBtn) return;

  function applyTheme(theme){
    if(theme === 'dark'){
      root.setAttribute('data-theme','dark');
      if(iconSun) iconSun.style.display='none';
      if(iconMoon) iconMoon.style.display='block';
    } else {
      root.removeAttribute('data-theme');
      if(iconSun) iconSun.style.display='block';
      if(iconMoon) iconMoon.style.display='none';
    }
  }
  const saved = localStorage.getItem('rymor-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  toggleBtn.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('rymor-theme', next);
  });
})();

/* -------------------------------------------------------------------------
   MARQUEE (homepage only — guarded)
------------------------------------------------------------------------- */
(function initMarquee(){
  const track = document.getElementById('marqueeTrack');
  if(!track) return;
  const stack = ['n8n','GoHighLevel','Zapier','Make.com','Claude','Gemini','Qdrant','Vapi','Slack API','JWT Auth','Meta Graph API','YouTube Data API'];
  track.innerHTML = [...stack, ...stack].map(s => `<span class="marquee-item"><span class="thread-dot"></span>${s}</span>`).join('');
})();

/* -------------------------------------------------------------------------
   SCROLL REVEAL
------------------------------------------------------------------------- */
(function initReveal(){
  const revealEls = document.querySelectorAll('.reveal');
  if(!revealEls.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.12});
  revealEls.forEach(el => io.observe(el));
})();

/* -------------------------------------------------------------------------
   CUSTOM CURSOR
------------------------------------------------------------------------- */
(function initCustomCursor(){
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if(!dot || !ring) return;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!isFinePointer || reduceMotion) return;

  document.body.classList.add('has-custom-cursor');
  let mouseX = innerWidth/2, mouseY = innerHeight/2;
  let ringX = mouseX, ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';

    const el = e.target.closest('a, button, input, textarea, [data-cursor="hover"]');
    ring.classList.toggle('hovering', Boolean(el));
  });

  function animateRing(){
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();
})();

/* -------------------------------------------------------------------------
   CONTACT FORM (homepage only — guarded)
   Posts to the FastAPI backend (backend/main.py) which emails the inquiry
   to your inbox. Deployed on Render — change this if the backend ever
   moves elsewhere.
------------------------------------------------------------------------- */
const API_BASE_URL = 'https://rymor-ai-site.onrender.com';

(function initContactForm(){
  const form = document.getElementById('contactForm');
  if(!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('contactSubmit');
    const status = document.getElementById('formStatus');
    const payload = {
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      message: form.message.value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'form-status';

    try {
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if(!res.ok){
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || 'Something went wrong. Please try again.');
      }
      status.textContent = "Message sent — I'll reply within one business day.";
      status.classList.add('success');
      form.reset();
    } catch(err){
      status.textContent = err.message || 'Something went wrong.';
      status.classList.add('error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send inquiry';
    }
  });
})();

/* =========================================================================
   AI CHAT WIDGET
   Persona prompt qualifies visitors AND answers factual questions about
   Rinnah's background, case studies, stack and certifications — sent to
   the backend on every message, which forwards it + history to the Gemini
   API as the system instruction (see backend/main.py -> /chat).

   Keep this in sync with the real content on the site: every number below
   comes straight from CASE_DATA in index.html, so if you update a case
   study's results, update the matching line here too.
   ========================================================================= */
const CHAT_PERSONA_PROMPT = `
You are Ada, the on-site AI assistant for Rymor AI — the practice of Rinnah
Mayor, an AI Automation & Systems Engineer (B.S. Computer Science) who
builds autonomous systems for service businesses: dispatch that never
sleeps, knowledge that answers itself, content that ships on its own.
Rinnah works across n8n, GoHighLevel, Zapier and Make.com for the plumbing,
and Claude and Gemini for the reasoning layer.

You have two jobs: (1) answer visitors' questions about Rinnah and the work
accurately using ONLY the facts below, and (2) gently qualify visitors
toward a discovery call when it sounds like a real fit.

RINNAH'S FOUR SERVICE DISCIPLINES
- Workflow Architecture — end-to-end design of automated systems that
  replace manual ops (dispatch, intake, fulfillment).
- AI Agents & Knowledge Systems — RAG pipelines and reasoning agents wired
  into a client's stack (retrieval, memory, grounded answers).
- Platform Engineering — production-grade builds in n8n, GoHighLevel,
  Zapier and Make.com — versioned, monitored, documented.
- Ops Intelligence — dashboards and audit trails so automated hours and
  dollars saved are measurable, not anecdotal.

CASE STUDIES (real, shipped work)
1. AI Dispatch & Dynamic Routing System — for a 23-truck HVAC & plumbing
   company. Problem: 4-5 missed emergency jobs a month from slow
   after-hours response (~$60K/year lost). Built: a 24-node n8n pipeline
   triggered the instant a call ends — idempotency guard via Supabase,
   AI triage + Haversine proximity ranking against the Jobber CRM, a
   drafted job with one-tap Slack approval, and an automatic Gmail
   confirmation to the caller. Results: response time down to under 60
   seconds (from 18 minutes), zero after-hours jobs missed in 60 days,
   11 minutes less drive time per job, an estimated $371K/year revenue
   gain. Stack: n8n, Vapi, Jobber CRM, Haversine calculation, Supabase,
   Gmail, Slack, OAuth2, webhooks.
2. Apex Home Repair Knowledge Hub — an internal RAG knowledge system.
   Problem: tribal knowledge (manuals, pricing, project history) scattered
   across emails and PDFs, costing employees hours of searching. Built: a
   RAG pipeline with Google Gemini reasoning over Qdrant vector retrieval,
   plus a Postgres-backed memory of prior conversations. Results: instant,
   grounded answers instead of manual searching; near-zero hallucination
   since it's grounded in Apex's own docs; a 24/7 "expert teammate" that
   freed up senior staff from being the walking encyclopedia. Stack: n8n,
   Google Gemini, Qdrant vector DB, Postgres memory, RAG.
3. AI Automated Content Engine — for content creators and marketing teams.
   Problem: short-form video content was written, rendered, checked and
   posted entirely by hand — a week of content took a week to make. Built:
   a scheduled n8n pipeline where Gemini writes the video prompt, a video
   generation API renders it (polled until ready), failed renders are
   filtered out, and finished clips auto-publish to Facebook and YouTube.
   Results: 10 videos produced in 10 minutes (down from a full week), 2
   platforms auto-published per run, fully unattended, with built-in
   quality filtering before publish. Stack: n8n, Google Gemini, video
   generation API, Meta Graph API, YouTube Data API, OAuth2, webhooks.

CERTIFICATIONS
Introduction to Workflow Automation with n8n; Introduction to AI Agents;
Understanding Prompt Engineering; Claude 101.

BOOKING & CONTACT
Discovery call: https://calendly.com/rymorai/discovery-call

HOW TO QUALIFY
When it's natural in the conversation, ask about:
1. What's currently manual or slow in their business operations.
2. Roughly how many hours per week their team loses to that process.
3. Whether they already use a CRM, dispatch tool, or automation platform.
If it sounds like a real fit (an operational bottleneck, some existing team
or tooling, non-trivial scale), tell them plainly the next step is a
discovery call and give them the link above. If it's out of scope (a
single tiny automation, no budget, a student project), be honest and kind
rather than pushing the call.

RULES
Keep every reply under ~60 words. Never invent case studies, pricing,
clients, or results beyond what's listed above. If you don't know
something, say so plainly and suggest the discovery call for specifics.
`.trim();

(function initChatWidget(){
  const bubble = document.getElementById('chatBubble');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const body = document.getElementById('chatBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  if(!bubble || !panel || !form) return;

  let chatHistory = [];

  function chatAddMessage(role, content){
    chatHistory.push({ role, content });
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.textContent = content;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  bubble.addEventListener('click', () => {
    const wasOpen = panel.classList.contains('open');
    panel.classList.toggle('open');
    if(!wasOpen && chatHistory.length === 0){
      chatAddMessage('assistant', "Hi, I'm Ada — ask me anything about Rinnah's background or the work on this site, or tell me what's slow in your business and I'll help figure out if we're a fit.");
    }
  });
  if(closeBtn){
    closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;

    chatAddMessage('user', text);
    input.value = '';
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ persona: CHAT_PERSONA_PROMPT, messages: chatHistory })
      });
      if(!res.ok) throw new Error('chat request failed');
      const data = await res.json();
      chatAddMessage('assistant', data.reply || 'Could you say a bit more about that?');
    } catch {
      chatAddMessage('assistant', "I'm having trouble connecting right now — feel free to book a discovery call directly in the meantime.");
    } finally {
      sendBtn.disabled = false;
    }
  });
})();
