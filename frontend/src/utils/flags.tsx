import type { CSSProperties } from 'react';

export const TEAM_FLAGS: Record<string, string> = {
  Mexico: 'mx',
  'South Korea': 'kr',
  'South Africa': 'za',
  'Czech Republic': 'cz',
  Canada: 'ca',
  Switzerland: 'ch',
  Qatar: 'qa',
  'Bosnia and Herzegovina': 'ba',
  Brazil: 'br',
  Morocco: 'ma',
  Scotland: 'gb-sct',
  Haiti: 'ht',
  USA: 'us',
  Paraguay: 'py',
  Australia: 'au',
  Turkey: 'tr',
  Germany: 'de',
  Ecuador: 'ec',
  'Ivory Coast': 'ci',
  'Curaçao': 'cw',
  Netherlands: 'nl',
  Japan: 'jp',
  Tunisia: 'tn',
  Sweden: 'se',
  Belgium: 'be',
  Iran: 'ir',
  Egypt: 'eg',
  'New Zealand': 'nz',
  Spain: 'es',
  Uruguay: 'uy',
  'Saudi Arabia': 'sa',
  'Cape Verde': 'cv',
  France: 'fr',
  Senegal: 'sn',
  Norway: 'no',
  Iraq: 'iq',
  Argentina: 'ar',
  Austria: 'at',
  Algeria: 'dz',
  Jordan: 'jo',
  Portugal: 'pt',
  Colombia: 'co',
  Uzbekistan: 'uz',
  'DR Congo': 'cd',
  England: 'gb-eng',
  Croatia: 'hr',
  Panama: 'pa',
  Ghana: 'gh',
};

interface FlagIconProps {
  team: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function FlagIcon({ team, size = 20, className = '', style }: FlagIconProps) {
  const code = TEAM_FLAGS[team];
  if (!code) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', width: size * 1.333, height: size, lineHeight: 1, ...style }}
      >
        🏳
      </span>
    );
  }
  return (
    <span
      className={`fi fi-${code} ${className}`.trim()}
      style={{
        display: 'inline-block',
        width: Math.round(size * 1.333),
        height: size,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        flexShrink: 0,
        ...style,
      }}
      title={team}
    />
  );
}
