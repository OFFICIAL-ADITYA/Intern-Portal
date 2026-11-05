import { useState } from 'react';
import TeamLeaderInternsView from './TeamLeaderInternsView';
import TeamLeaderList from './TeamLeaderList';

export default function TeamLeadersSection() {
  const [teamLeaderId, setTeamLeaderId] = useState(null);

  return teamLeaderId === null
    ? <TeamLeaderList onSelect={(id) => setTeamLeaderId(id)} />
    : <TeamLeaderInternsView teamLeaderId={teamLeaderId} onBack={() => setTeamLeaderId(null)} />;
}
