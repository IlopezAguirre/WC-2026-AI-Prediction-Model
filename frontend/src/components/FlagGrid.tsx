const WC2026_FLAGS: { name: string; code: string }[] = [
  { name: 'Mexico', code: 'mx' },
  { name: 'South Korea', code: 'kr' },
  { name: 'South Africa', code: 'za' },
  { name: 'Czech Republic', code: 'cz' },
  { name: 'Canada', code: 'ca' },
  { name: 'Switzerland', code: 'ch' },
  { name: 'Qatar', code: 'qa' },
  { name: 'Bosnia & Herz.', code: 'ba' },
  { name: 'Brazil', code: 'br' },
  { name: 'Morocco', code: 'ma' },
  { name: 'Scotland', code: 'gb-sct' },
  { name: 'Haiti', code: 'ht' },
  { name: 'USA', code: 'us' },
  { name: 'Paraguay', code: 'py' },
  { name: 'Australia', code: 'au' },
  { name: 'Turkey', code: 'tr' },
  { name: 'Germany', code: 'de' },
  { name: 'Ecuador', code: 'ec' },
  { name: 'Ivory Coast', code: 'ci' },
  { name: 'Curaçao', code: 'cw' },
  { name: 'Netherlands', code: 'nl' },
  { name: 'Japan', code: 'jp' },
  { name: 'Tunisia', code: 'tn' },
  { name: 'Sweden', code: 'se' },
  { name: 'Belgium', code: 'be' },
  { name: 'Iran', code: 'ir' },
  { name: 'Egypt', code: 'eg' },
  { name: 'New Zealand', code: 'nz' },
  { name: 'Spain', code: 'es' },
  { name: 'Uruguay', code: 'uy' },
  { name: 'Saudi Arabia', code: 'sa' },
  { name: 'Cape Verde', code: 'cv' },
  { name: 'France', code: 'fr' },
  { name: 'Senegal', code: 'sn' },
  { name: 'Norway', code: 'no' },
  { name: 'Iraq', code: 'iq' },
  { name: 'Argentina', code: 'ar' },
  { name: 'Austria', code: 'at' },
  { name: 'Algeria', code: 'dz' },
  { name: 'Jordan', code: 'jo' },
  { name: 'Portugal', code: 'pt' },
  { name: 'Colombia', code: 'co' },
  { name: 'Uzbekistan', code: 'uz' },
  { name: 'DR Congo', code: 'cd' },
  { name: 'England', code: 'gb-eng' },
  { name: 'Croatia', code: 'hr' },
  { name: 'Panama', code: 'pa' },
  { name: 'Ghana', code: 'gh' },
];

export function FlagGrid() {
  return (
    <section className="w-full py-8 border-t border-zinc-800">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 text-center mb-6">
        48 Qualified Nations · FIFA World Cup 2026
      </p>
      <div className="flex flex-wrap justify-center gap-6 px-4">
        {WC2026_FLAGS.map(({ name, code }) => (
          <div key={code} className="flex flex-col items-center gap-1.5 w-16">
            <span
              className={`fi fi-${code}`}
              style={{
                display: 'inline-block',
                width: 48,
                height: 36,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              title={name}
            />
            <span className="text-[9px] font-black uppercase tracking-wide text-zinc-400 text-center leading-tight">
              {name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
