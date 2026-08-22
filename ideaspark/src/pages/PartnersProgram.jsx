import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitPartnerApplication, getMyPartnerApplication } from '../api/partnerApi';
import Icon from '../components/common/Icon';

/* ── Constants ─────────────────────────────────────────────────────────── */
const REGISTRATION_DEADLINE = 'September 30, 2026';
const TOTAL_STEPS = 5;

const AGE_GROUPS = ['Under 18', '18-24', '25-34', '35+'];
const AGE_VALUES = ['under_18', '18-24', '25-34', '35+'];

const PARTICIPANT_TYPES = ['Student', 'Professional', 'Freelancer', 'Entrepreneur'];
const PARTICIPANT_VALUES = ['student', 'professional', 'freelancer', 'entrepreneur'];

const CURRENT_YEARS = ['1st', '2nd', '3rd', '4th', 'Postgraduate', 'Graduated'];
const CURRENT_YEAR_VALUES = ['1st', '2nd', '3rd', '4th', 'postgraduate', 'graduated'];

const EXPERIENCE_OPTIONS = ['0-1', '1-3', '3-5', '5-10', '10+'];

const INDUSTRIES = [
  'Technology', 'Marketing', 'Finance', 'Design',
  'Education', 'Healthcare', 'Media', 'Other',
];

const SUBSCRIPTION_OPTIONS = [
  {
    value: 'creator_pro',
    label: 'Creator Pro',
    desc: 'For users who want to create and publish content.',
  },
  {
    value: 'reader_pro',
    label: 'Reader Pro',
    desc: 'For users who primarily want to discover and read content.',
  },
  {
    value: 'not_sure',
    label: 'Not sure',
    desc: 'Let SoCreate recommend the appropriate plan.',
  },
];

/* ── Shared styles ─────────────────────────────────────────────────────── */
const inputClass =
  'w-full px-4 py-3 rounded-xl border border-[var(--sc-neutral-200)] ' +
  'bg-[var(--sc-neutral-50)] text-[var(--sc-neutral-800)] text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--sc-primary-500)] ' +
  'focus:border-transparent transition placeholder:text-[var(--sc-neutral-400)]';

const selectClass = inputClass + ' appearance-none cursor-pointer';

const btnPrimary =
  'flex-1 py-3 rounded-xl font-semibold text-white text-sm ' +
  'bg-[var(--sc-primary-500)] active:bg-[var(--sc-primary-600)] ' +
  'disabled:opacity-50 disabled:pointer-events-none transition';

const btnSecondary =
  'flex-1 py-3 rounded-xl font-semibold text-sm ' +
  'border border-[var(--sc-neutral-200)] text-[var(--sc-neutral-600)] ' +
  'active:bg-[var(--sc-neutral-100)] transition';

/* ── Progress Bar ──────────────────────────────────────────────────────── */
function StepProgress({ step }) {
  return (
    <div className="flex gap-2 mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i <= step
              ? 'bg-[var(--sc-primary-500)]'
              : 'bg-[var(--sc-neutral-200)]'
          }`}
        />
      ))}
    </div>
  );
}

/* ── Deadline Badge ────────────────────────────────────────────────────── */
function DeadlineBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--sc-primary-200)] bg-[var(--sc-primary-50)] text-xs font-medium text-[var(--sc-primary-600)]">
      <Icon name="clock" className="w-3.5 h-3.5" />
      Registration closes {REGISTRATION_DEADLINE}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 1 — Personal Information
   Mobile number is optional. Required: name, email, age group, type.
   ══════════════════════════════════════════════════════════════════════ */
function Step1({ form, onChange, onNext, errors }) {
  return (
    <div className="px-5 pb-6">
      <StepProgress step={0} />
      <p className="text-xs font-semibold text-[var(--sc-primary-500)] mb-1 uppercase">
        Step 1 of {TOTAL_STEPS}
      </p>
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mb-4">
        Personal Information
      </h2>

      <DeadlineBadge />

      <div className="mt-5 space-y-4">
        <Field label="Full Name" error={errors.fullName}>
          <input
            className={inputClass}
            placeholder="Your full name"
            value={form.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
          />
        </Field>

        <Field label="Email Address" error={errors.email}>
          <input
            className={inputClass}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </Field>

        <Field label="Mobile Number (optional)">
          <input
            className={inputClass}
            placeholder="+91 00000 00000"
            value={form.mobileNumber}
            onChange={(e) => onChange('mobileNumber', e.target.value)}
          />
        </Field>

        <Field label="City">
          <input
            className={inputClass}
            placeholder="e.g. Bengaluru"
            value={form.city}
            onChange={(e) => onChange('city', e.target.value)}
          />
        </Field>

        <Field label="Age Group" error={errors.ageGroup}>
          <select
            className={selectClass}
            value={form.ageGroup}
            onChange={(e) => onChange('ageGroup', e.target.value)}
          >
            <option value="">Select age group</option>
            {AGE_GROUPS.map((label, i) => (
              <option key={AGE_VALUES[i]} value={AGE_VALUES[i]}>{label}</option>
            ))}
          </select>
          {form.ageGroup === 'under_18' && (
            <p className="text-xs text-[var(--sc-error)] mt-1">
              This program is open to participants aged 18 and above.
            </p>
          )}
        </Field>

        <Field label="Participant Type" error={errors.participantType}>
          <select
            className={selectClass}
            value={form.participantType}
            onChange={(e) => onChange('participantType', e.target.value)}
          >
            <option value="">Select type</option>
            {PARTICIPANT_TYPES.map((label, i) => (
              <option key={PARTICIPANT_VALUES[i]} value={PARTICIPANT_VALUES[i]}>{label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6">
        <button
          onClick={onNext}
          className={btnPrimary + ' w-full'}
          disabled={form.ageGroup === 'under_18'}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 2 — Student Details / Professional Details
   Student: college mandatory, course/degree + year + graduation optional.
   Professional: organisation mandatory, job title + industry + experience optional.
   ══════════════════════════════════════════════════════════════════════ */
function Step2({ form, onChange, onNext, onBack, errors }) {
  const isStudent = form.participantType === 'student';

  return (
    <div className="px-5 pb-6">
      <StepProgress step={1} />
      <p className="text-xs font-semibold text-[var(--sc-primary-500)] mb-1 uppercase">
        Step 2 of {TOTAL_STEPS}
      </p>
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mb-5">
        {isStudent ? 'Student Details' : 'Professional Details'}
      </h2>

      <div className="space-y-4">
        {isStudent ? (
          <>
            <Field label="College / University Name" error={errors.collegeName}>
              <input
                className={inputClass}
                placeholder="e.g. Delhi University"
                value={form.collegeName}
                onChange={(e) => onChange('collegeName', e.target.value)}
              />
            </Field>
            <Field label="Course / Degree (optional)">
              <input
                className={inputClass}
                placeholder="e.g. B.Tech, B.A."
                value={form.courseDegree}
                onChange={(e) => onChange('courseDegree', e.target.value)}
              />
            </Field>
            <Field label="Current Year (optional)">
              <select
                className={selectClass}
                value={form.currentYear}
                onChange={(e) => onChange('currentYear', e.target.value)}
              >
                <option value="">Select year</option>
                {CURRENT_YEARS.map((label, i) => (
                  <option key={CURRENT_YEAR_VALUES[i]} value={CURRENT_YEAR_VALUES[i]}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Graduation Year (optional)">
              <input
                className={inputClass}
                placeholder="e.g. 2027"
                value={form.graduationYear}
                onChange={(e) => onChange('graduationYear', e.target.value)}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Organisation" error={errors.companyOrganisation}>
              <input
                className={inputClass}
                placeholder="e.g. Acme Inc."
                value={form.companyOrganisation}
                onChange={(e) => onChange('companyOrganisation', e.target.value)}
              />
            </Field>
            <Field label="Job Title / Role (optional)">
              <input
                className={inputClass}
                placeholder="e.g. Marketing Manager"
                value={form.jobTitle}
                onChange={(e) => onChange('jobTitle', e.target.value)}
              />
            </Field>
            <Field label="Industry (optional)">
              <select
                className={selectClass}
                value={form.industry}
                onChange={(e) => onChange('industry', e.target.value)}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind.toLowerCase()}>{ind}</option>
                ))}
              </select>
            </Field>
            <Field label="Years of Experience (optional)">
              <select
                className={selectClass}
                value={form.yearsOfExperience}
                onChange={(e) => onChange('yearsOfExperience', e.target.value)}
              >
                <option value="">Select range</option>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className={btnSecondary}>Back</button>
        <button onClick={onNext} className={btnPrimary}>Next</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 3 — About You & SoCreate
   Single question: What best describes you? (Creator / Reader / Both)
   ══════════════════════════════════════════════════════════════════════ */
function Step3({ form, onChange, onNext, onBack }) {
  return (
    <div className="px-5 pb-6">
      <StepProgress step={2} />
      <p className="text-xs font-semibold text-[var(--sc-primary-500)] mb-1 uppercase">
        Step 3 of {TOTAL_STEPS}
      </p>
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mb-5">
        About You &amp; SoCreate
      </h2>

      <div>
        <label className="text-sm font-medium text-[var(--sc-neutral-700)] mb-3 block">
          What best describes you?
        </label>
        <div className="flex gap-2">
          {['Creator', 'Reader', 'Both'].map((opt) => (
            <button
              key={opt}
              onClick={() => onChange('bestDescribes', opt.toLowerCase())}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                form.bestDescribes === opt.toLowerCase()
                  ? 'bg-[var(--sc-primary-500)] text-white border-[var(--sc-primary-500)]'
                  : 'border-[var(--sc-neutral-200)] text-[var(--sc-neutral-600)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className={btnSecondary}>Back</button>
        <button onClick={onNext} className={btnPrimary}>Next</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 4 — Choose Your Subscription
   ══════════════════════════════════════════════════════════════════════ */
function Step4({ form, onChange, onNext, onBack }) {
  const isStudent = form.participantType === 'student';

  return (
    <div className="px-5 pb-6">
      <StepProgress step={3} />
      <p className="text-xs font-semibold text-[var(--sc-primary-500)] mb-1 uppercase">
        Step 4 of {TOTAL_STEPS}
      </p>
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mb-2">
        Choose Your Subscription
      </h2>
      <p className="text-sm text-[var(--sc-neutral-500)] mb-5">
        {isStudent
          ? 'Students get 90 days free'
          : 'Professionals get 60 days free'}{' '}
        — activated once your registration is verified.
      </p>

      <div className="space-y-3">
        {SUBSCRIPTION_OPTIONS.map(({ value, label, desc }) => (
          <button
            key={value}
            onClick={() => onChange('subscriptionChoice', value)}
            className={`w-full text-left p-4 rounded-xl border-2 transition ${
              form.subscriptionChoice === value
                ? 'border-[var(--sc-primary-500)] bg-[var(--sc-primary-50)]'
                : 'border-[var(--sc-neutral-200)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  form.subscriptionChoice === value
                    ? 'border-[var(--sc-primary-500)] bg-[var(--sc-primary-500)]'
                    : 'border-[var(--sc-neutral-300)]'
                }`}
              >
                {form.subscriptionChoice === value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--sc-neutral-900)]">{label}</p>
                <p className="text-xs text-[var(--sc-neutral-500)] mt-0.5">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className={btnSecondary}>Back</button>
        <button onClick={onNext} className={btnPrimary}>Next</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 5 — Consent & Submit
   ══════════════════════════════════════════════════════════════════════ */
function Step5({ form, onChange, onSubmit, onBack, submitting, error }) {
  return (
    <div className="px-5 pb-6">
      <StepProgress step={4} />
      <p className="text-xs font-semibold text-[var(--sc-primary-500)] mb-1 uppercase">
        Step 5 of {TOTAL_STEPS}
      </p>
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mb-5">
        Consent &amp; Submit
      </h2>

      <div className="space-y-4">
        <Checkbox
          checked={form.consentProgram}
          onChange={(v) => onChange('consentProgram', v)}
          required
        >
          I agree to register for the SoCreate Partner Program and receive
          communications related to the program and my subscription.
        </Checkbox>

        <Checkbox
          checked={form.consentUpdates}
          onChange={(v) => onChange('consentUpdates', v)}
        >
          I would like to receive updates about SoCreate, new features, events
          and offers.
        </Checkbox>

        <Checkbox
          checked={form.consentFuturePrograms}
          onChange={(v) => onChange('consentFuturePrograms', v)}
        >
          I agree that SoCreate may contact me about future creator/reader programs.
        </Checkbox>
      </div>

      {error && (
        <p className="text-sm text-[var(--sc-error)] mt-4">{error}</p>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className={btnSecondary} disabled={submitting}>
          Back
        </button>
        <button
          onClick={onSubmit}
          className={btnPrimary}
          disabled={!form.consentProgram || submitting}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RESULT SCREENS — Queue / Verified / Already In
   ══════════════════════════════════════════════════════════════════════ */
function QueueScreen({ queuePosition, onContinue }) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-12 pb-8">
      <StatusIcon icon="clock" bg="bg-[var(--sc-accent-100)]" color="text-[var(--sc-accent-600)]" />
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mt-5 mb-2">
        You're in the queue! 🎉
      </h2>
      <p className="text-sm text-[var(--sc-neutral-500)] mb-6 leading-relaxed max-w-xs">
        Your registration is submitted. We'll verify your details, confirm your
        SoCreate account, and activate your Pro subscription once approved.
      </p>
      <div className="py-4 px-8 rounded-2xl bg-[var(--sc-neutral-50)] border border-[var(--sc-neutral-200)]">
        <p className="text-3xl font-bold text-[var(--sc-neutral-900)]">
          #{queuePosition}
        </p>
        <p className="text-xs text-[var(--sc-primary-500)] font-medium mt-1">
          in the Partners Program queue
        </p>
      </div>
      <button onClick={onContinue} className={btnSecondary + ' w-full max-w-xs mt-8'}>
        Continue Exploring
      </button>
    </div>
  );
}

function VerifiedScreen({ onContinue }) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-12 pb-8">
      <StatusIcon icon="check" bg="bg-[var(--sc-success-light)]" color="text-[var(--sc-success)]" />
      <h2 className="text-xl font-bold text-[var(--sc-neutral-900)] mt-5 mb-2">
        You're verified! ✅
      </h2>
      <p className="text-sm text-[var(--sc-neutral-500)] mb-6 leading-relaxed max-w-xs">
        Your complimentary Creator Pro subscription is now active. You can start
        exploring the application right away.
      </p>
      <button onClick={onContinue} className={btnPrimary + ' w-full max-w-xs'}>
        Continue Exploring
      </button>
    </div>
  );
}



/* ── Helpers ───────────────────────────────────────────────────────────── */
function StatusIcon({ icon, bg, color }) {
  return (
    <div className={`w-20 h-20 rounded-full ${bg} flex items-center justify-center`}>
      <Icon name={icon} className={`w-10 h-10 ${color}`} />
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--sc-neutral-700)] mb-1.5 block">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-[var(--sc-error)] mt-1">{error}</p>}
    </div>
  );
}

function Checkbox({ checked, onChange, required, children }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition ${
          checked
            ? 'bg-[var(--sc-primary-500)] border-[var(--sc-primary-500)]'
            : 'border-[var(--sc-neutral-300)]'
        }`}
      >
        {checked && <Icon name="check" className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-[var(--sc-neutral-600)] leading-snug">{children}</span>
    </label>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
const EMPTY_FORM = {
  fullName: '',
  email: '',
  mobileNumber: '',
  city: '',
  ageGroup: '',
  participantType: '',
  // student
  collegeName: '',
  courseDegree: '',
  currentYear: '',
  graduationYear: '',
  // professional
  jobTitle: '',
  companyOrganisation: '',
  industry: '',
  yearsOfExperience: '',
  // about
  bestDescribes: '',
  // subscription
  subscriptionChoice: 'creator_pro',
  // consent
  consentProgram: true,
  consentUpdates: false,
  consentFuturePrograms: false,
};

export default function PartnersProgram() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [screen, setScreen] = useState('loading'); // loading | form | queue | verified
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    fullName: user?.name || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [queuePosition, setQueuePosition] = useState(null);

  // Check existing application on mount
  useEffect(() => {
    if (!user) {
      setScreen('form');
      return;
    }
    (async () => {
      try {
        const { data } = await getMyPartnerApplication();
        if (data.applied === false) {
          setScreen('form');
        } else if (data.status === 'pending') {
          setQueuePosition(data.queuePosition);
          setScreen('queue');
        } else if (data.status === 'approved') {
          setScreen('verified');
        } else {
          setScreen('form'); // rejected — let them re-apply
        }
      } catch {
        setScreen('form');
      }
    })();
  }, [user]);

  const onChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // ── Validation ────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.ageGroup) e.ageGroup = 'Required';
    if (!form.participantType) e.participantType = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (form.participantType === 'student') {
      if (!form.collegeName.trim()) e.collegeName = 'Required';
    } else {
      if (!form.companyOrganisation.trim()) e.companyOrganisation = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Navigation ────────────────────────────────────────────────────────
  const nextStep = (validator) => {
    if (validator && !validator()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.consentProgram) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await submitPartnerApplication(form);
      setQueuePosition(data.queuePosition);
      setScreen('queue');
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setSubmitError(msg);
    }
    setSubmitting(false);
  };

  const goHome = () => navigate('/home');

  // ── Loading ───────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[var(--sc-primary-200)] border-t-[var(--sc-primary-500)] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Shell ─────────────────────────────────────────────────────────────
  const showClose = screen !== 'loading';

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar with X */}
      {showClose && (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 py-3">
          <div className="w-8" />
          <div />
          <button onClick={goHome} className="p-1">
            <Icon name="x" className="w-5 h-5 text-[var(--sc-neutral-500)]" />
          </button>
        </div>
      )}

      {/* Screens */}

      {screen === 'form' && step === 0 && (
        <Step1
          form={form}
          onChange={onChange}
          onNext={() => nextStep(validateStep1)}
          errors={errors}
        />
      )}

      {screen === 'form' && step === 1 && (
        <Step2
          form={form}
          onChange={onChange}
          onNext={() => nextStep(validateStep2)}
          onBack={prevStep}
          errors={errors}
        />
      )}

      {screen === 'form' && step === 2 && (
        <Step3
          form={form}
          onChange={onChange}
          onNext={() => nextStep()}
          onBack={prevStep}
        />
      )}

      {screen === 'form' && step === 3 && (
        <Step4
          form={form}
          onChange={onChange}
          onNext={() => nextStep()}
          onBack={prevStep}
        />
      )}

      {screen === 'form' && step === 4 && (
        <Step5
          form={form}
          onChange={onChange}
          onSubmit={handleSubmit}
          onBack={prevStep}
          submitting={submitting}
          error={submitError}
        />
      )}

      {screen === 'queue' && (
        <QueueScreen queuePosition={queuePosition} onContinue={goHome} />
      )}

      {screen === 'verified' && <VerifiedScreen onContinue={goHome} />}
    </div>
  );
}