// Wireframe kit components — sketchy primitives shared across screens
const { useState, useEffect, useRef, Fragment } = React;

// Sketchy icon that's just a labeled box (for low-fi)
function Ic({ label = '', size = 14, color = 'var(--line)' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `1.2px solid ${color}`, borderRadius: 3,
      fontSize: size * 0.6, fontFamily: "'Patrick Hand',cursive",
      textAlign: 'center', lineHeight: `${size - 2}px`,
      color, flexShrink: 0,
    }}>{label}</span>
  );
}

function Box({ children, style = {}, dashed, filled, ink, accent, tan, sage, double, className = '', ...rest }) {
  const cls = ['wf-box',
    dashed && 'dashed', filled && 'filled',
    ink && 'ink', accent && 'accent', tan && 'tan', sage && 'sage',
    double && 'double', className
  ].filter(Boolean).join(' ');
  return <div className={cls} style={style} {...rest}>{children}</div>;
}

function Chip({ children, filled, tan, sage, rose, dot, style = {} }) {
  const cls = ['wf-chip', filled && 'filled', tan && 'tan', sage && 'sage', rose && 'rose', dot && 'dot'].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{children}</span>;
}

function Btn({ children, primary, tan, sage, ghost, sm, onClick, style = {} }) {
  const cls = ['wf-btn', primary && 'primary', tan && 'tan', sage && 'sage', ghost && 'ghost', sm && 'sm'].filter(Boolean).join(' ');
  return <button className={cls} onClick={onClick} style={style}>{children}</button>;
}

function Input({ placeholder = '', dashed, value, style = {} }) {
  return <div className={'wf-input ' + (dashed ? 'dashed' : '')} style={{...style, color: value ? 'var(--ink)' : 'var(--muted)'}}>
    {value || placeholder}
  </div>;
}

function Img({ label = 'photo', w = '100%', h = 100, style = {} }) {
  return <div className="wf-img" style={{ width: w, height: h, ...style }}>{label}</div>;
}

function Avatar({ initials = 'DM', size = 36, color = 'var(--accent-tan)', style = {} }) {
  return <div className="wf-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.5, ...style }}>{initials}</div>;
}

function Stat({ n, l, style = {} }) {
  return <div className="wf-stat" style={style}>
    <span className="n">{n}</span>
    <span className="l">{l}</span>
  </div>;
}

function Check({ children, done }) {
  return <div className={'wf-check ' + (done ? 'done' : '')}>
    <span className="box">{done ? '✓' : ''}</span>
    <span className="label">{children}</span>
  </div>;
}

function Bar({ pct = 40, color = 'var(--accent)', style = {} }) {
  return <div className="wf-bar" style={style}>
    <span style={{ width: `${pct}%`, background: color }} />
  </div>;
}

function Sticky({ children, rot = -1.2, style = {} }) {
  return <div className="wf-sticky" style={{ transform: `rotate(${rot}deg)`, ...style }}>{children}</div>;
}

function AI({ children = 'AI' }) {
  return <span className="ai-badge">{children}</span>;
}

function Hr() { return <hr className="wf-hr" />; }

function UL({ children, accent }) {
  return <span className={'wf-ul ' + (accent ? 'accent' : '')}>{children}</span>;
}

// Squiggly arrow between two things
function Arrow({ children = '→' }) {
  return <span className="wf-arrow">{children}</span>;
}

// Red-pen annotation
function Anno({ children, style = {} }) {
  return <span className="wf-anno" style={style}>{children}</span>;
}

// Frame wrapper with label + caption
function Frame({ label, caption, children }) {
  return <div className="variation-cell">
    <div className="wf-frame-label">{label}</div>
    {caption && <div className="wf-frame-caption">{caption}</div>}
    {children}
  </div>;
}

// Phone shell (low-fi, ~iPhone proportions)
function Phone({ children, nav = true, scale = 1, style = {}, tabbarItems }) {
  const tabs = tabbarItems || [
    { label: 'Home', active: true },
    { label: 'CRM' },
    { label: 'Deals' },
    { label: 'Content' },
    { label: 'More' },
  ];
  return <div className="phone-shell" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', ...style }}>
    <div className="phone-top-nav">
      {['Home','Prospect','CRM','Deals','Content','Email'].map((t, i) => (
        <span key={t} className={'pitem ' + (i === 0 ? 'active' : '')}>{t}</span>
      ))}
    </div>
    <div className="phone-body">{children}</div>
    {nav && <div className="phone-tabbar">
      {tabs.map((t, i) => (
        <div key={i} className={'pt ' + (t.active ? 'active' : '')}>
          <span className="icon" />
          <span>{t.label}</span>
        </div>
      ))}
    </div>}
  </div>;
}

// Desktop shell with sidebar + top nav
function Desktop({ active = 'Home', title = 'Command', url = 'command.app', children, width = '100%' }) {
  const navItems = ['Home','Prospect','CRM','Deals','Content','Email','Bio Link','Money','Toolkit','Settings'];
  return <div className="desktop-shell" style={{ width }}>
    <div className="desktop-chrome">
      <span className="dot" style={{ background: '#e48179' }} />
      <span className="dot" style={{ background: '#e5c86b' }} />
      <span className="dot" style={{ background: '#8fb77a' }} />
      <span className="url">{url}</span>
    </div>
    <div className="top-nav">
      <span className="hand-alt" style={{ fontStyle: 'italic', marginRight: 16, fontSize: 16 }}>Command</span>
      {navItems.map(n => (
        <span key={n} className={'nav-item ' + (n === active ? 'active' : '')}>{n}</span>
      ))}
    </div>
    <div className="desktop-body">
      <div className="side-nav">
        <div className="logo">Command</div>
        {navItems.map(n => (
          <div key={n} className={'nav-item ' + (n === active ? 'active' : '')}>
            <span className="ic" />{n}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 10px' }}>
          Dana Massey<br/>
          <span style={{ fontSize: 10 }}>Friday, Apr 17</span>
        </div>
      </div>
      <div className="main-area">{children}</div>
    </div>
  </div>;
}

Object.assign(window, { Ic, Box, Chip, Btn, Input, Img, Avatar, Stat, Check, Bar, Sticky, AI, Hr, UL, Arrow, Anno, Frame, Phone, Desktop });
