import type { Metadata } from 'next'
import Link from 'next/link'
import { RoomVisualizerPreview } from '../components/visualizer/RoomVisualizerPreview'

export const metadata: Metadata = {
  title: 'Spatial Blueprint Studio | FurnishAI',
  description:
    'Interactive 2D architectural blueprint and 3D isometric whole-home furniture layout visualizer. Test layouts, scale furniture pieces, check walkway clearances, and export layout specs.',
}

export default function VisualizerPage() {
  return (
    <div className="visualizer-page-container">
      <style>{`
        .visualizer-page-container {
          min-height: 100vh;
          background: #fbf9f5;
          color: #1e1b18;
          font-family: inherit;
          padding-bottom: 60px;
        }
        .visualizer-nav-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 28px;
          background: #ffffff;
          border-bottom: 1px solid rgba(184, 147, 90, 0.2);
          position: sticky;
          top: 0;
          z-index: 40;
        }
        .visualizer-brand {
          font-size: 20px;
          font-weight: 800;
          text-decoration: none;
          color: #1e1b18;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .visualizer-brand-accent {
          color: #c4623a;
        }
        .visualizer-nav-links {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .visualizer-nav-link {
          font-size: 13px;
          font-weight: 600;
          color: #5c5248;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .visualizer-nav-link:hover {
          color: #c4623a;
        }
        .visualizer-nav-cta {
          background: #c4623a;
          color: #ffffff !important;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .visualizer-hero-banner {
          max-width: 1200px;
          margin: 32px auto 24px;
          padding: 0 20px;
          text-align: center;
        }
        .visualizer-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f4ede4;
          color: #7b4a2d;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .visualizer-hero-title {
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 800;
          line-height: 1.18;
          color: #1e1b18;
          margin: 0 0 10px;
        }
        .visualizer-hero-subtitle {
          font-size: 15px;
          color: #63574c;
          max-width: 680px;
          margin: 0 auto;
          line-height: 1.5;
        }
        .visualizer-main-content {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .visualizer-guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin-top: 36px;
        }
        .visualizer-guide-card {
          background: #ffffff;
          border: 1px solid rgba(184, 147, 90, 0.2);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }
        .visualizer-guide-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .visualizer-guide-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e1b18;
          margin: 0 0 6px;
        }
        .visualizer-guide-desc {
          font-size: 13px;
          color: #6a5e53;
          margin: 0;
          line-height: 1.45;
        }
      `}</style>

      {/* Top Header Navigation */}
      <header className="visualizer-nav-header">
        <Link href="/" className="visualizer-brand" aria-label="FurnishAI Home">
          <span>Furnish</span>
          <span className="visualizer-brand-accent">AI</span>
          <span style={{ fontSize: '11px', background: '#f4ede4', color: '#7b4a2d', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
            Spatial Studio
          </span>
        </Link>

        <div className="visualizer-nav-links">
          <Link href="/" className="visualizer-nav-link">Home</Link>
          <Link href="/saved" className="visualizer-nav-link">Saved Items</Link>
          <Link href="/find" className="visualizer-nav-link visualizer-nav-cta">Start Room Matching →</Link>
        </div>
      </header>

      {/* Hero Introduction */}
      <section className="visualizer-hero-banner" aria-label="Spatial visualizer header">
        <div className="visualizer-hero-pill">
          <span>📐</span> Spatial Blueprint & 3D Isometric Studio
        </div>
        <h1 className="visualizer-hero-title">
          Whole-Home Spatial Planning & Layout Studio
        </h1>
        <p className="visualizer-hero-subtitle">
          Design, equip, and validate your home layouts before making a single purchase.
          Drag furniture pieces to physical scale, inspect walkway circulation clearance,
          and export printable blueprint specifications.
        </p>
      </section>

      {/* Central Visualizer Canvas */}
      <main className="visualizer-main-content">
        <RoomVisualizerPreview
          roomType="living"
          roomWidthFt={16}
          roomDepthFt={13}
          allowZoneSwitching
          allowCatalogEquip
        />

        {/* Feature Guides & Capabilities */}
        <section className="visualizer-guide-grid" aria-label="Visualizer capabilities">
          <article className="visualizer-guide-card">
            <div className="visualizer-guide-icon">📐</div>
            <h2 className="visualizer-guide-title">2D Blueprint & 3D Isometric View</h2>
            <p className="visualizer-guide-desc">
              Toggle between classic architectural overhead blueprints with precision grid markers and 3D isometric perspectives to perceive true spatial depth.
            </p>
          </article>

          <article className="visualizer-guide-card">
            <div className="visualizer-guide-icon">✨</div>
            <h2 className="visualizer-guide-title">Equip This Space Drawer</h2>
            <p className="visualizer-guide-desc">
              Browse Indian furniture pieces from Pepperfry, IKEA, and Nilkamal. Select pieces and have them placed directly into your layout scaled to actual centimeters.
            </p>
          </article>

          <article className="visualizer-guide-card">
            <div className="visualizer-guide-icon">⚠️</div>
            <h2 className="visualizer-guide-title">Circulation & Collision Guard</h2>
            <p className="visualizer-guide-desc">
              Dashed circulation halos indicate natural human walkways. The engine triggers warning badges whenever pieces impede circulation or overlap.
            </p>
          </article>

          <article className="visualizer-guide-card">
            <div className="visualizer-guide-icon">📥</div>
            <h2 className="visualizer-guide-title">Printable Spec & JSON Export</h2>
            <p className="visualizer-guide-desc">
              Generate an itemized bill of materials with dimensions, estimated budget totals, and square-footage occupancy for contractors or interior designers.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}
