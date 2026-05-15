const FLAGS: Record<string, string> = {
  Mexico: '🇲🇽', 'South Korea': '🇰🇷', 'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿',
  Canada: '🇨🇦', Switzerland: '🇨🇭', Qatar: '🇶🇦', 'Bosnia and Herzegovina': '🇧🇦',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Haiti: '🇭🇹',
  USA: '🇺🇸', Paraguay: '🇵🇾', Australia: '🇦🇺', Turkey: '🇹🇷',
  Germany: '🇩🇪', Ecuador: '🇪🇨', 'Ivory Coast': '🇨🇮', 'Curaçao': '🇨🇼',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Tunisia: '🇹🇳', Sweden: '🇸🇪',
  Belgium: '🇧🇪', Iran: '🇮🇷', Egypt: '🇪🇬', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', Uruguay: '🇺🇾', 'Saudi Arabia': '🇸🇦', 'Cape Verde': '🇨🇻',
  France: '🇫🇷', Senegal: '🇸🇳', Norway: '🇳🇴', Iraq: '🇮🇶',
  Argentina: '🇦🇷', Austria: '🇦🇹', Algeria: '🇩🇿', Jordan: '🇯🇴',
  Portugal: '🇵🇹', Colombia: '🇨🇴', Uzbekistan: '🇺🇿', 'DR Congo': '🇨🇩',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', Panama: '🇵🇦', Ghana: '🇬🇭',
};

export function flag(team: string): string {
  return FLAGS[team] ?? '🏳';
}
