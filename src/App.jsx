
import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabase'

const subteams = [
  {
    number: '01',
    icon: '⚡',
    name: 'ELECTRICAL',
    description:
      'Developing electrical systems, wiring, battery integration and electronic components for our electric racing bike.',
  },
  {
    number: '02',
    icon: '🛞',
    name: 'SUSPENSION AND BRAKING',
    description:
      'Improving ride stability, suspension performance and braking safety for better control on the track.',
  },
  {
    number: '03',
    icon: '✈️',
    name: 'AERODYNAMIC BODY DESIGN',
    description:
      'Designing the bike body with a focus on airflow, aerodynamic efficiency and racing aesthetics.',
  },
  {
    number: '04',
    icon: '⚙️',
    name: 'POWERTRAIN',
    description:
      'Working on the electric motor, drivetrain and power delivery to achieve efficient performance.',
  },
  {
    number: '05',
    icon: '🔩',
    name: 'CHASSIS AND FRAME',
    description:
      'Designing and developing a strong, lightweight frame for structural strength and vehicle stability.',
  },
  {
    number: '06',
    icon: '📸',
    name: 'MEDIA',
    description:
      'Capturing our journey through photography, videos, creative content and team promotions.',
  },
]

const specifications = [
  { label: 'Motor Rated Power', value: '3 kW', note: 'Peak power: 6 kW' },
  { label: 'Battery Pack', value: '72 V · 40 Ah', note: 'Lithium-ion' },
  { label: 'Target Top Speed', value: '70 km/h', note: 'Maximum speed' },
  { label: 'Target Range', value: '80–100 km', note: 'Per charge' },
  { label: 'Frame Material', value: 'AISI 4130', note: 'Chromoly steel' },
  { label: 'Target Kerb Weight', value: '~85 kg', note: 'Approximate' },
  {
    label: 'Overall Dimensions',
    value: '2100 × 800 × 1250 mm',
    note: 'L × W × H',
  },
]

const emptyApplication = {
  full_name: '',
  phone: '',
  department: '',
  study_year: '',
  subteam: '',
  motivation: '',
}

const applicationColumns =
  'id, full_name, college_email, phone, department, study_year, subteam, motivation, status, admin_notes, created_at'

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState(emptyApplication)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Admin dashboard state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminApplications, setAdminApplications] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [notesDrafts, setNotesDrafts] = useState({})
  
  // Achievement form state
  const [achievementTitle, setAchievementTitle] = useState('')
  const [achievementDescription, setAchievementDescription] = useState('')
  const [achievementEvent, setAchievementEvent] = useState('EBDC 2026 - Season 6.0')
  const [achievementDate, setAchievementDate] = useState('22–26 September 2026')
  const [achievementLocation, setAchievementLocation] = useState(
    'Sri Ramakrishna Institute of Technology, Coimbatore'
  )
  const [achievementMessage, setAchievementMessage] = useState('')
  const [achievementSaving, setAchievementSaving] = useState(false)

  // Events and awards
  const [achievements, setAchievements] = useState([])
  const [achievementsError, setAchievementsError] = useState('')
  useEffect(() => {
  async function loadAchievements() {
    const { data, error } = await supabase
      .from('team_achievements')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      setAchievementsError(error.message)
      return
    }

    setAchievements(data ?? [])
    setAchievementsError('')
  }

  loadAchievements()
}, [])
  // Restore the Supabase session and listen for login/logout.
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        setError(error.message)
        return
      }

      setUser(data.session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load the logged-in student's own application.
  useEffect(() => {
    if (!user) {
      setApplication(null)
      return
    }

    let cancelled = false

    async function loadApplication() {
      const { data, error } = await supabase
        .from('applications')
        .select(applicationColumns)
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setError(`Could not load application: ${error.message}`)
        return
      }

      setApplication(data)

      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          phone: data.phone ?? '',
          department: data.department ?? '',
          study_year: data.study_year ?? '',
          subteam: data.subteam ?? '',
          motivation: data.motivation ?? '',
        })
      }
    }

    loadApplication()

    return () => {
      cancelled = true
    }
  }, [user])

  // Verify admin access through the Supabase security function.
  useEffect(() => {
    let active = true

    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false)
        setAdminApplications([])
        setNotesDrafts({})
        return
      }

      const { data, error } = await supabase.rpc('is_team_admin')

      if (!active) return

      if (error) {
        console.error('Admin check failed:', error.message)
        setIsAdmin(false)
        setAdminError(`Admin verification failed: ${error.message}`)
        return
      }

      setIsAdmin(data === true)
    }

    checkAdmin()

    return () => {
      active = false
    }
  }, [user])

  // Fetch every application only after admin access is verified.
  async function loadAdminApplications() {
    setAdminLoading(true)
    setAdminError('')
    setAdminMessage('')

    const { data, error } = await supabase
      .from('applications')
      .select(applicationColumns)
      .order('created_at', { ascending: false })

    if (error) {
      setAdminError(`Could not load applications: ${error.message}`)
      setAdminLoading(false)
      return
    }

    const rows = data ?? []
    setAdminApplications(rows)

    setNotesDrafts((previous) => {
      const next = { ...previous }

      rows.forEach((item) => {
        if (!(item.id in next)) {
          next[item.id] = item.admin_notes ?? ''
        }
      })

      return next
    })

    setAdminLoading(false)
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdminApplications()
    } else {
      setAdminApplications([])
    }
  }, [isAdmin])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleAuth(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail.endsWith('@skcet.ac.in')) {
      setError('Please use your official @skcet.ac.in college email.')
      return
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (data.session) {
          setUser(data.session.user)
          setMessage('Account created. You can now complete your application.')
        } else {
          setMessage(
            'Signup successful! Check your SKCET email inbox, verify your email, then return here and log in.'
          )
          setAuthMode('login')
          setPassword('')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (error) throw error

        setUser(data.user)
        setMessage('Login successful! Complete your recruitment application below.')
        setPassword('')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleApplication(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!user) {
      setError('Please log in with your verified college email first.')
      return
    }

    if (!user.email?.toLowerCase().endsWith('@skcet.ac.in')) {
      setError('Only SKCET college email accounts can submit applications.')
      return
    }

    setLoading(true)

    try {
      const applicationData = {
        user_id: user.id,
        full_name: form.full_name.trim(),
        college_email: user.email,
        phone: form.phone.trim(),
        department: form.department,
        study_year: form.study_year,
        subteam: form.subteam,
        motivation: form.motivation.trim(),
      }

      const { data, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select(applicationColumns)
        .single()

      if (error) throw error

      setApplication(data)
      setMessage('Application submitted successfully! Good luck, future racer.')

      if (isAdmin) {
        await loadAdminApplications()
      }
    } catch (err) {
      if (err.code === '23505') {
        setError(
          'An application may already exist for this account. Refresh the page to check.'
        )
      } else {
        setError(`Application submission failed: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setError('')
    setMessage('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    setUser(null)
    setIsAdmin(false)
    setApplication(null)
    setAdminApplications([])
    setNotesDrafts({})
    setForm(emptyApplication)
    setEmail('')
    setPassword('')
    setAuthMode('login')
    setMessage('You have been logged out.')
  }

  // Admin: update an application's status.
  async function updateApplicationStatus(id, status) {
    if (!isAdmin) return

    setSavingId(id)
    setAdminError('')
    setAdminMessage('')

    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)

    if (error) {
      setAdminError(`Status update failed: ${error.message}`)
      setSavingId(null)
      return
    }

    setAdminApplications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    )

    if (application?.id === id) {
      setApplication((previous) => ({ ...previous, status }))
    }

    setAdminMessage('Application status updated successfully.')
    setSavingId(null)
  }

  // Admin: save notes for an application.
  async function saveApplicationNotes(id) {
    if (!isAdmin) return

    setSavingId(id)
    setAdminError('')
    setAdminMessage('')

    const admin_notes = notesDrafts[id] ?? ''

    const { error } = await supabase
      .from('applications')
      .update({ admin_notes })
      .eq('id', id)

    if (error) {
      setAdminError(`Could not save notes: ${error.message}`)
      setSavingId(null)
      return
    }

    setAdminApplications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, admin_notes } : item
      )
    )

    setAdminMessage('Admin notes saved successfully.')
    setSavingId(null)
  }
  
  // Admin: add an achievement
  async function handleAddAchievement(event) {
    event.preventDefault()

    if (!isAdmin) return

    setAchievementSaving(true)
    setAchievementMessage('')

    const payload = {
      title: achievementTitle.trim(),
      category: 'award',
      description: achievementDescription.trim(),
      event_name: achievementEvent.trim(),
      event_date: achievementDate.trim(),
      location: achievementLocation.trim(),
    }

    if (!payload.title) {
      setAchievementMessage('Please enter an award title.')
      setAchievementSaving(false)
      return
    }

    const { error } = await supabase
      .from('team_achievements')
      .insert(payload)

    if (error) {
      setAchievementMessage(`Save failed: ${error.message}`)
      setAchievementSaving(false)
      return
    }

    const { data, error: refreshError } = await supabase
      .from('team_achievements')
      .select('*')
      .order('id', { ascending: true })

    if (refreshError) {
      setAchievementMessage(
        `Award saved, but refresh failed: ${refreshError.message}`
      )
    } else {
      setAchievements(data ?? [])
      setAchievementTitle('')
      setAchievementDescription('')
      setAchievementMessage('Award added successfully!')
    }

    setAchievementSaving(false)
  }

  // Admin: edit an achievement
  async function handleEditAchievement(item) {
    if (!isAdmin) return

    const title = window.prompt('Award title:', item.title)
    if (title === null) return

    const description = window.prompt(
      'Award description:',
      item.description ?? ''
    )
    if (description === null) return

    if (!title.trim()) {
      setAchievementMessage('Award title cannot be empty.')
      return
    }

    const { error } = await supabase
      .from('team_achievements')
      .update({
        title: title.trim(),
        description: description.trim(),
      })
      .eq('id', item.id)

    if (error) {
      setAchievementMessage(`Edit failed: ${error.message}`)
      return
    }

    setAchievements((previous) =>
      previous.map((award) =>
        award.id === item.id
          ? {
              ...award,
              title: title.trim(),
              description: description.trim(),
            }
          : award
      )
    )

    setAchievementMessage('Award updated successfully!')
  }

  // Admin: delete an achievement
  async function handleDeleteAchievement(item) {
    if (!isAdmin) return

    const confirmed = window.confirm(
      `Delete "${item.title}" permanently?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('team_achievements')
      .delete()
      .eq('id', item.id)

    if (error) {
      setAchievementMessage(`Delete failed: ${error.message}`)
      return
    }

    setAchievements((previous) =>
      previous.filter((award) => award.id !== item.id)
    )

    setAchievementMessage('Award deleted successfully.')
  }


  return (
    <main className="website">
      <nav className="navbar">
        <a className="brand" href="#">
          <img
            className="brand-logo"
            src="/logo%20gt.jpeg"
            alt="GEN TORQ logo"
          />
          <span className="brand-text">
            <strong>GEN-TORQ</strong>
            <small>RACING E-BIKE TEAM</small>
          </span>
        </a>

        <div className="nav-actions">
          <a className="nav-link" href="#about">ABOUT US ↗</a>
          <a className="nav-link" href="#recruitment">JOIN THE TEAM ↗</a>
          {isAdmin && (
            <a className="nav-link" href="#admin-dashboard">
              ADMIN DASHBOARD ↗
            </a>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">ENGINEERED TO RACE · BUILT TO WIN</p>
          <h1>
            POWER THE
            <span> FUTURE.</span>
          </h1>
          <p className="intro">
            We are GEN-TORQ RACING — a student engineering team
            building the future of electric mobility through
            innovation, teamwork and performance.
          </p>
          <a className="cta" href="#team-video">
            MEET OUR TEAM <span>↗</span>
          </a>
          <div className="hero-bottom">
            <span>ELECTRIC.</span>
            <span>ENGINEERED.</span>
            <span>UNSTOPPABLE.</span>
          </div>
        </div>
      </section>

      <section className="intro-video-section" id="team-video">
        <p className="eyebrow">01 / MEET THE TEAM</p>
        <h2>
          OUR STORY.
          <br />
          <span>OUR PASSION.</span>
        </h2>
        <p className="section-description">
          Discover the people, passion and engineering behind GEN-TORQ RACING.
        </p>
        <div className="intro-video-frame">
          <video
            autoPlay
            muted
            controls
            playsInline
            preload="auto"
            poster="/bike-side.jpeg.jpeg"
          >
            <source src="/intro.mp4.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
        </div>
        <p className="video-caption">
          GEN-TORQ RACING · OUR TEAM · OUR JOURNEY
        </p>
      </section>

      <section className="about" id="about">
        <div className="about-content">
          <p className="eyebrow">02 / ABOUT US</p>
          <h2>
            ENGINEERED BY PASSION.
            <br />
            <span>DRIVEN BY INNOVATION.</span>
          </h2>
          <div className="about-text">
            <p>
              Founded in 2026, <strong>GEN TORQ RACING</strong> from
              <strong> Sri Krishna College of Engineering and Technology,
              Department of Electrical and Electronic Engineering</strong>,
              is a student-driven electric mobility team dedicated to
              innovation, engineering excellence, and sustainable motorsports.
            </p>
            <p>
              We design, develop, and test electric bikes, transforming
              classroom knowledge into real-world engineering solutions.
              From vehicle design and battery management to performance
              optimization, our team combines creativity, technical skills,
              and teamwork to push the boundaries of electric mobility.
            </p>
            <p>
              Driven by a passion for racing and a vision for a sustainable
              future, we aim to showcase our engineering capabilities
              through E-Bike competitions while learning, innovating,
              and growing together.
            </p>
          </div>
          <div className="about-tagline">
            YOUNG MINDS. BOLD IDEAS. ELECTRIC DREAMS.
            <span>— GEN TORQ RACING</span>
          </div>
        </div>
      </section>

      <section className="subteams" id="subteams">
        <div className="subteams-header">
          <p className="eyebrow">03 / HOW WE ENGINEER</p>
          <h2>OUR <span>SUBTEAMS.</span></h2>
          <p className="section-description">
            Six specialized teams. One shared vision.
            Together, we engineer the future of electric racing.
          </p>
        </div>
        <div className="subteams-grid">
          {subteams.map((team) => (
            <article className="subteam-card" key={team.number}>
              <div className="subteam-top">
                <span className="subteam-number">{team.number}</span>
                <span className="subteam-icon" aria-hidden="true">
                  {team.icon}
                </span>
              </div>
              <h3>{team.name}</h3>
              <p>{team.description}</p>
              <div className="subteam-line" />
            </article>
          ))}
        </div>
        <p className="subteams-footer">
          ONE TEAM. SIX SPECIALIZATIONS. INFINITE POSSIBILITIES.
        </p>
      </section>

      <section className="bike-details" id="bike">
        <div className="bike-info">
          <p className="eyebrow">04 / OUR MACHINE</p>
          <h2>ENGINEERING IN MOTION.</h2>
          <p className="section-description">
            Every component represents teamwork, testing and our passion for electric mobility.
          </p>
        </div>
        <div className="bike-image">
          <img
            src="/bike-side.jpeg.jpeg"
            alt="GEN-TORQ racing e-bike side profile"
            loading="lazy"
          />
        </div>
      </section>

      {/* EVENTS & ACHIEVEMENTS */}
      <section className="achievements-section" id="achievements">
        <div className="achievements-header">
          <p className="eyebrow">05 / OUR ACHIEVEMENTS</p>
          <h2>
            BUILT TO RACE.
            <br />
            <span>RECOGNIZED FOR EXCELLENCE.</span>
          </h2>
          <p className="section-description">
            Our first student-built electric bike, GEN TORQ, proudly participated
            in EBDC 2026 – Season 6.0, a National Level Electric Bike Design
            Challenge held from 22–26 September 2026 at Sri Ramakrishna Institute
            of Technology, Coimbatore.
          </p>
        </div>

        <div className="achievements-grid">
          {achievements.map((item) => (
            <article className="achievement-card" key={item.id}>
              <div className="achievement-icon">🏆</div>
              <p className="eyebrow">GEN TORQ · EBDC 2026</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="achievement-event">{item.event_name}</span>
            </article>
          ))}
        </div>

        {achievementsError && (
          <p className="form-message form-error">
            Could not load achievements: {achievementsError}
          </p>
        )}

        <div className="achievement-mentors">
          <p className="eyebrow">FACULTY MENTORS</p>
          <h3>Dr. T. Bharani Prakash <span>— AP/EEE</span></h3>
          <h3>Dr. S. Dilip Kumar <span>— AP/EEE</span></h3>
        </div>

        <p className="achievements-footer">
          FOUR AWARDS. ONE TEAM. A REMARKABLE BEGINNING.
        </p>
      </section>

      {/* RECRUITMENT */}
      <section className="recruitment-section" id="recruitment">
        <div className="recruitment-header">
          <p className="eyebrow">06 / BECOME PART OF THE TEAM</p>
          <h2>
            YOUR IDEAS.
            <br />
            <span>OUR NEXT BUILD.</span>
          </h2>
          <p className="section-description">
            Passionate about electric mobility? Apply to join one of our six subteams.
            Only verified SKCET college email accounts can submit applications.
          </p>
        </div>

        <div className="recruitment-panel">
          {error && (
            <p className="form-message form-error" role="alert">{error}</p>
          )}
          {message && (
            <p className="form-message form-success" role="status">{message}</p>
          )}
          {!user ? (
            <>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={authMode === 'signup' ? 'auth-tab active' : 'auth-tab'}
                  onClick={() => {
                    setAuthMode('signup')
                    setError('')
                    setMessage('')
                  }}
                >
                  CREATE ACCOUNT
                </button>
                <button
                  type="button"
                  className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
                  onClick={() => {
                    setAuthMode('login')
                    setError('')
                    setMessage('')
                  }}
                >
                  STUDENT LOGIN
                </button>
              </div>

              <form className="recruitment-form" onSubmit={handleAuth}>
                <label htmlFor="college-email">SKCET COLLEGE EMAIL</label>
                <input
                  id="college-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="yourname@skcet.ac.in"
                  autoComplete="email"
                  required
                />

                <label htmlFor="account-password">PASSWORD</label>
                <input
                  id="account-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />

                <button className="recruitment-submit" type="submit" disabled={loading}>
                  {loading
                    ? 'PLEASE WAIT...'
                    : authMode === 'signup'
                      ? 'CREATE ACCOUNT ↗'
                      : 'LOGIN ↗'}
                </button>
              </form>

              <p className="verification-note">
                {authMode === 'signup'
                  ? 'We will send a verification link to your college email. Verify it before logging in.'
                  : 'Use your verified SKCET email and password to continue.'}
              </p>
            </>
          ) : (
            <>
              <div className="logged-in-row">
                <div>
                  <p className="field-eyebrow">SIGNED IN AS</p>
                  <p className="signed-in-email">{user.email}</p>
                  {isAdmin && (
                    <p className="admin-account-label">ADMIN ACCOUNT</p>
                  )}
                </div>
                <button className="logout-button" type="button" onClick={handleLogout}>
                  LOG OUT
                </button>
              </div>

              {application ? (
                <div className="application-status">
                  <p className="field-eyebrow">APPLICATION RECEIVED</p>
                  <h3>THANK YOU, {application.full_name.toUpperCase()}.</h3>
                  <p>Your application is saved in the GEN-TORQ recruitment database.</p>
                  <div className="status-detail">
                    <span>Selected subteam</span>
                    <strong>{application.subteam}</strong>
                  </div>
                  <div className="status-detail">
                    <span>Application status</span>
                    <strong>{application.status || 'Pending'}</strong>
                  </div>
                  <p className="verification-note">
                    Your application status will update when the recruitment team reviews it.
                  </p>
                </div>
              ) : (
                <form className="recruitment-form application-form" onSubmit={handleApplication}>
                  <p className="field-eyebrow">STUDENT APPLICATION</p>

                  <label htmlFor="full-name">FULL NAME</label>
                  <input
                    id="full-name"
                    name="full_name"
                    value={form.full_name}
                    onChange={updateForm}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />

                  <label htmlFor="phone">PHONE NUMBER</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateForm}
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    pattern="[0-9+() -]{7,20}"
                    required
                  />

                  <label htmlFor="department">DEPARTMENT</label>
                  <input
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={updateForm}
                    placeholder="e.g. EEE"
                    required
                  />

                  <label htmlFor="study-year">YEAR OF STUDY</label>
                  <select
                    id="study-year"
                    name="study_year"
                    value={form.study_year}
                    onChange={updateForm}
                    required
                  >
                    <option value="">Select your year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>

                  <label htmlFor="subteam">CHOOSE YOUR SUBTEAM</label>
                  <select
                    id="subteam"
                    name="subteam"
                    value={form.subteam}
                    onChange={updateForm}
                    required
                  >
                    <option value="">Select a subteam</option>
                    {subteams.map((team) => (
                      <option key={team.number} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="motivation">WHY DO YOU WANT TO JOIN?</label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    value={form.motivation}
                    onChange={updateForm}
                    placeholder="Tell us about your interests, skills and ideas..."
                    rows={5}
                    maxLength={1500}
                    required
                  />

                  <button className="recruitment-submit" type="submit" disabled={loading}>
                    {loading ? 'SUBMITTING...' : 'SUBMIT APPLICATION ↗'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      {/* ADMIN DASHBOARD: rendered only for verified admins */}
      {user && isAdmin && (
        <section className="admin-dashboard" id="admin-dashboard">
          <div className="admin-dashboard-header">
            <p className="eyebrow">07 / RECRUITMENT MANAGEMENT</p>
            <h2>ADMIN <span>DASHBOARD.</span></h2>
            <p className="section-description">
              Review applications and manage candidate status securely.
            </p>
          </div>

          {adminError && (
            <p className="form-message form-error" role="alert">{adminError}</p>
          )}
          {adminMessage && (
            <p className="form-message form-success" role="status">{adminMessage}</p>
          )}

          <div className="admin-dashboard-toolbar">
            <span>
              Total applications: <strong>{adminApplications.length}</strong>
            </span>
            <button
              type="button"
              className="recruitment-submit admin-refresh"
              onClick={loadAdminApplications}
              disabled={adminLoading}
            >
              {adminLoading ? 'LOADING...' : 'REFRESH APPLICATIONS ↻'}
            </button>
          </div>
          
          <div className="achievement-admin-panel">
            <h3>MANAGE ACHIEVEMENTS</h3>
            <p>Add a new team award to the public website.</p>

            <form
              className="recruitment-form"
              onSubmit={handleAddAchievement}
            >
              <label htmlFor="achievement-title">AWARD TITLE</label>
              <input
                id="achievement-title"
                value={achievementTitle}
                onChange={(event) =>
                  setAchievementTitle(event.target.value)
                }
                placeholder="e.g. Best Innovation Award"
                required
              />

              <label htmlFor="achievement-description">
                DESCRIPTION
              </label>
              <textarea
                id="achievement-description"
                value={achievementDescription}
                onChange={(event) =>
                  setAchievementDescription(event.target.value)
                }
                placeholder="Describe the achievement..."
                rows={3}
              />

              <label htmlFor="achievement-event">EVENT NAME</label>
              <input
                id="achievement-event"
                value={achievementEvent}
                onChange={(event) =>
                  setAchievementEvent(event.target.value)
                }
                required
              />

              <label htmlFor="achievement-date">EVENT DATE</label>
              <input
                id="achievement-date"
                value={achievementDate}
                onChange={(event) =>
                  setAchievementDate(event.target.value)
                }
              />

              <label htmlFor="achievement-location">LOCATION</label>
              <input
                id="achievement-location"
                value={achievementLocation}
                onChange={(event) =>
                  setAchievementLocation(event.target.value)
                }
              />

              <button
                className="recruitment-submit"
                type="submit"
                disabled={achievementSaving}
              >
                {achievementSaving
                  ? 'SAVING...'
                  : 'ADD ACHIEVEMENT +'}
              </button>
            </form>

            {achievementMessage && (
              <p className="form-message" role="status">
                {achievementMessage}
              </p>
            )}

            <div className="achievement-admin-list">
              {achievements.map((item) => (
                <div className="admin-detail-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleEditAchievement(item)}
                    >
                      EDIT
                    </button>
                    {' '}
                    <button
                      type="button"
                      onClick={() => handleDeleteAchievement(item)}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {adminLoading ? (
            <p className="verification-note">Loading applications...</p>
          ) : adminApplications.length === 0 ? (
            <p className="verification-note">No applications found yet.</p>
          ) : (
            <div className="admin-applications-grid">
              {adminApplications.map((item) => (
                <article className="admin-application-card" key={item.id}>
                  <div className="admin-card-top">
                    <span className="field-eyebrow">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className="admin-status-badge">
                      {item.status || 'Pending'}
                    </span>
                  </div>

                  <h3>{item.full_name}</h3>
                  <p className="admin-candidate-email">{item.college_email}</p>

                  <div className="admin-detail-row">
                    <span>Phone</span>
                    <strong>{item.phone || '—'}</strong>
                  </div>
                  <div className="admin-detail-row">
                    <span>Department</span>
                    <strong>{item.department || '—'}</strong>
                  </div>
                  <div className="admin-detail-row">
                    <span>Year</span>
                    <strong>{item.study_year || '—'}</strong>
                  </div>
                  <div className="admin-detail-row">
                    <span>Subteam</span>
                    <strong>{item.subteam || '—'}</strong>
                  </div>

                  <div className="admin-motivation">
                    <p className="field-eyebrow">MOTIVATION</p>
                    <p>{item.motivation || 'No motivation response provided.'}</p>
                  </div>

                  <label htmlFor={`status-${item.id}`}>APPLICATION STATUS</label>
                  <select
                    id={`status-${item.id}`}
                    value={item.status || 'Pending'}
                    disabled={savingId === item.id}
                    onChange={(event) =>
                      updateApplicationStatus(item.id, event.target.value)
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <label htmlFor={`notes-${item.id}`}>PRIVATE ADMIN NOTES</label>
                  <textarea
                    id={`notes-${item.id}`}
                    rows={3}
                    maxLength={2000}
                    value={notesDrafts[item.id] ?? ''}
                    placeholder="Add internal recruitment notes..."
                    disabled={savingId === item.id}
                    onChange={(event) =>
                      setNotesDrafts((previous) => ({
                        ...previous,
                        [item.id]: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="button"
                    className="recruitment-submit admin-save-notes"
                    disabled={savingId === item.id}
                    onClick={() => saveApplicationNotes(item.id)}
                  >
                    {savingId === item.id ? 'SAVING...' : 'SAVE NOTES'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        <strong>GEN-TORQ RACING</strong>
        <span>THE FUTURE IS ELECTRIC.</span>
      </footer>
    </main>
  )
}

export default App
