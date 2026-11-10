import { useState } from 'react';
import type { Product } from './api';
export function ProductArt({
  category = 'Lighting',
  variant = 0,
  className = '',
}: {
  category?: string;
  variant?: number;
  className?: string;
}) {
  const color =
    category === 'Lighting'
      ? '#cfff52'
      : category === 'Audio'
        ? '#ff7448'
        : category === 'Organization'
          ? '#40e8ff'
          : category === 'Hobby'
            ? '#ff8bc6'
            : '#d8d0b9';
  return (
    <svg
      className={'product-art ' + className}
      viewBox="0 0 240 200"
      fill="none"
      role="img"
      aria-label={`${category} product illustration`}
    >
      <ellipse cx="124" cy="175" rx="73" ry="10" fill="#000" opacity=".2" />
      {category === 'Lighting' ? (
        <g stroke="#18202a" strokeWidth="3" strokeLinejoin="round">
          <path d="M55 162l57-16 61 16-59 17z" fill="#343e43" />
          <path d="M110 150V92L152 49" stroke={color} strokeWidth="10" />
          <path d="M109 149V93l43-45" stroke="#73864d" strokeWidth="3" />
          <circle cx="110" cy="94" r="8" fill={color} />
          <path d="M142 30l38 10 15 36-67-18z" fill={color} />
          <path d="M128 58l67 18-10 7-66-18z" fill="#f3ffd6" />
          <path d="M123 68l64 15-28 69-62-16z" fill={color} opacity=".07" stroke="none" />
          <path d="M58 160l56 15 57-14" stroke="#657061" />
        </g>
      ) : category === 'Audio' ? (
        <g stroke="#202630" strokeWidth="3">
          <path d="M65 112V83c0-67 113-67 113 0v36" stroke="#15202b" strokeWidth="21" />
          <path d="M65 107V83c0-67 113-67 113 0v29" stroke={color} strokeWidth="12" />
          <path d="M56 103l20-8 17 15v49l-18 13-23-15z" fill="#38424c" />
          <path d="M72 108l17 7v40l-17 11z" fill={color} />
          <path d="M166 100l20 9 7 45-23 18-17-12v-47z" fill="#343d48" />
          <path d="M164 108l16 7v39l-16 12z" fill={color} />
          <path d="M114 43q24-9 43 17" stroke="#ffe2d5" opacity=".4" strokeWidth="3" />
        </g>
      ) : category === 'Organization' ? (
        <g stroke="#17232d" strokeWidth="3" strokeLinejoin="round">
          <path d="M43 110l94-38 65 29-96 45z" fill={color} />
          <path d="M43 110v38l63 32v-34z" fill="#257787" />
          <path d="M106 146l96-45v38l-96 41z" fill="#349eaf" />
          <path d="M54 111l82-29 52 20-82 34z" fill="#192c35" />
          <path d="M63 99V69l76-29 49 20v34l-50 20z" fill="#b1e4df" />
          <path d="M78 100V59m15 47V54m15 56V49m15 58V45" opacity=".3" />
          <path d="M72 135l22 10v12l-22-10z" fill="#9be7ef" />
        </g>
      ) : category === 'Desk' ? (
        <g stroke="#26312e" strokeWidth="3" strokeLinejoin="round">
          <path d="M49 127l108-49 47 28-108 52z" fill={color} />
          <path d="M60 124l96-42 34 23-95 45z" fill="#b9b39d" />
          <path d="M57 125l39 24 96-44v10l-96 47-39-24z" fill="#77796f" />
          <path d="M98 159v17l70-32v-18" fill="#6c756a" />
          <path d="M64 119l4-55 92-40 33 23-1 55-96 45z" fill="#303b3c" />
          <path d="M75 67l81-35 27 19-1 46-85 40-25-21z" fill="#52706b" />
          <path d="M83 75l72-32 18 13-1 31-72 34-17-11z" fill="#8aa295" />
          <circle cx="128" cy="82" r="9" fill={color} />
        </g>
      ) : category === 'Stationery' ? (
        <g stroke="#252d32" strokeWidth="3" strokeLinejoin="round">
          <path d="M50 97l93-43 48 30v68l-93 43-48-31z" fill="#505f5d" />
          <path d="M50 97l47 30 94-43-48-30z" fill={color} />
          <path d="M97 127v68l94-43V84z" fill="#e7debf" />
          <path d="M107 138l73-34m-73 43l73-34m-73 43l73-34m-73 43l73-34" stroke="#b5b29b" />
          <path d="M55 76l88-38 48 30-92 41z" fill="#ff7448" />
          <path d="M53 76v15l46 30v-12z" fill="#ad5035" />
          <path d="M87 65l29-12 28 18-29 12z" fill="#17202a" />
        </g>
      ) : (
        <g stroke="#28262c" strokeWidth="3" strokeLinejoin="round">
          <path d="M48 121l101-49 48 33-99 51z" fill="#d7c5ad" />
          <path d="M48 121v20l51 33v-18z" fill="#968477" />
          <path d="M99 156l98-51v19l-98 50z" fill="#b7a48c" />
          <path d="M73 122l64-30 31 20-63 31z" fill="#f3e6d7" />
          <path d="M100 118l18-72 10-12 4 16-20 73z" fill={color} />
          <path d="M136 128l18-63 11-15 3 18-21 65z" fill="#cfff52" />
          <path d="M111 66l9-20 10 4-6 19z" fill="#ffe9cd" />
          <circle cx="76" cy="139" r="5" fill="#ff7448" />
        </g>
      )}
      {variant % 2 === 1 && (
        <path d="M28 47h10m-5-5v10m161 92h10m-5-5v10" stroke={color} opacity=".7" strokeWidth="2" />
      )}
    </svg>
  );
}
export function Warehouse({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (category: string) => void;
}) {
  const [active, setActive] = useState('Lighting');
  const categories = ['Lighting', 'Audio', 'Organization', 'Desk', 'Stationery', 'Hobby'];
  const positions = [
    [130, 130],
    [255, 75],
    [380, 130],
    [130, 280],
    [255, 225],
    [380, 280],
  ];
  return (
    <div className="warehouse">
      <div className="warehouse-top">
        <span>
          <i className="live-dot" /> INVENTORY NETWORK
        </span>
        <span>LIVE CATALOG ↗</span>
      </div>
      <svg
        className="warehouse-map"
        viewBox="0 0 570 510"
        aria-label="Interactive warehouse inventory map"
      >
        <defs>
          <pattern
            id="grid"
            width="36"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="skewY(-25)"
          >
            <path d="M36 0H0V20" fill="none" stroke="#35413b" strokeWidth=".6" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <path d="M18 255L280 80l274 173-270 180z" fill="url(#grid)" opacity=".65" />
        <g fill="none" stroke="#cfff52" strokeWidth="1.5" opacity=".5">
          <path
            d="M126 185l130 76 127-76M126 335l130-75 128 75M257 110v302"
            strokeDasharray="4 7"
          />
          <path d="M52 281l205 121 218-123" />
          <path d="M52 290l205 121 218-123" opacity=".2" />
        </g>
        {categories.map((category, i) => {
          const [x, y] = positions[i],
            selected = active === category;
          return (
            <g
              key={category}
              className="warehouse-node"
              role="button"
              tabIndex={0}
              aria-label={`Explore ${category}`}
              onMouseEnter={() => setActive(category)}
              onFocus={() => setActive(category)}
              onClick={() => onSelect(category)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(category);
                }
              }}
              transform={`translate(${x},${y})`}
            >
              <ellipse
                cx="0"
                cy="58"
                rx="59"
                ry="22"
                fill={selected ? '#cfff52' : '#758878'}
                opacity={selected ? 0.09 : 0.03}
              />
              <path
                d="M-43-5L0-30 43-5 0 20z"
                fill={selected ? '#cfff52' : '#536052'}
                stroke={selected ? '#e5ffae' : '#869383'}
              />
              <path
                d="M-43-5v52L0 72V20z"
                fill={selected ? '#647e32' : '#263327'}
                stroke="#60734e"
              />
              <path
                d="M0 20l43-25v52L0 72z"
                fill={selected ? '#93ae4b' : '#394c35'}
                stroke="#60734e"
              />
              <path d="M-23-16l43 26v12l-9 5V14l-43-25z" fill="#101b17" opacity=".6" />
              <path d="M7 43l23-13v12L7 55z" fill={selected ? '#e1ff9c' : '#718667'} />
              <path
                d="M-34 30l19 11m-19-5l19 11"
                stroke={selected ? '#cfff52' : '#7d916e'}
                strokeWidth="2"
              />
              <text
                x="0"
                y="102"
                textAnchor="middle"
                fill={selected ? '#cfff52' : '#a0aa9b'}
                fontFamily="IBM Plex Mono"
                fontSize="9"
              >
                {category.toUpperCase()}
              </text>
            </g>
          );
        })}
        <g transform="translate(255 419)">
          <path d="M-18 0L0-10 18 0 0 10z" fill="#ff7448" />
          <path d="M0-29v26" stroke="#ff7448" />
          <circle cy="-33" r="5" fill="#ff7448" />
          <text y="35" textAnchor="middle" fontSize="10" fontFamily="IBM Plex Mono" fill="#ff7448">
            YOU ARE HERE
          </text>
        </g>
        <g fill="#a8b69b" fontFamily="IBM Plex Mono" fontSize="8">
          <text x="20" y="70">
            SECTOR 07 // RECLAIM
          </text>
          <text x="410" y="446">
            GRID 06.17
          </text>
          <text x="410" y="460">
            6 STOCK ZONES
          </text>
        </g>
      </svg>
      <div className="warehouse-tooltip">
        <span className="tiny">SECTOR / {active.toUpperCase()}</span>
        <strong>
          {products.filter((p) => p.category === active).reduce((s, p) => s + p.available, 0)} units
          in the vault
        </strong>
        <button onClick={() => onSelect(active)}>
          Scout this stock <span>↗</span>
        </button>
      </div>
      <div className="warehouse-bottom">
        <span>◆ {products.length} SKUs ONLINE</span>
        <span>CLICK A CRATE TO EXPLORE</span>
      </div>
    </div>
  );
}
