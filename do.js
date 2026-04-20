const fs = require('fs');
const path = require('path');
const targetStyle = 'bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]';
const filesToProcess = [
  'frontend/src/components/workspace/WorkspaceHome.tsx',
  'frontend/src/components/workspace/ResourcesView.tsx',
  'frontend/src/components/workspace/ResourceItem.tsx',
  'frontend/src/components/workspace/Chattie.tsx',
  'frontend/src/components/workspace/SummarizationView.tsx',
  'frontend/src/components/workspace/summarization/ResultsPhase.tsx',
  'frontend/src/components/workspace/FlashcardsView.tsx',
  'frontend/src/components/workspace/study-room/StudyRoomView.tsx',
  'frontend/src/components/workspace/QuizView.tsx',
  'frontend/src/components/workspace/quiz/QuizCard.tsx',
  'frontend/src/components/workspace/quiz/QuizResultsView.tsx',
  'frontend/src/app/(dashboard)/settings/layout.tsx',
  'frontend/src/app/(dashboard)/settings/page.tsx',
  'frontend/src/app/(dashboard)/settings/profile/page.tsx',
  'frontend/src/app/(dashboard)/settings/preferences/page.tsx',
  'frontend/src/app/(dashboard)/settings/subscription/page.tsx'
];
for(const fp of filesToProcess) {
  const fullPath = path.join(__dirname, fp);
  if(!fs.existsSync(fullPath)) continue;
  let t = fs.readFileSync(fullPath, 'utf8');
  let o = t;
  t = t.replace(/border-fade-border bg-main/g, 'border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  t = t.replace(/bg-bg-card border border-fade-border/g, targetStyle);
  t = t.replace(/border border-fade-border bg-bg-card/g, targetStyle);
  t = t.replace(/bg-bg-card\\/50 backdrop-blur-md/g, targetStyle);
  t = t.replace(/bg-bg-card\\/60 backdrop-blur-xl/g, targetStyle);
  t = t.replace(/border-l border-fade-border flex flex-col bg-bg-card\\/30/g, 'border-l flex flex-col ' + targetStyle);
  t = t.replace(/bg-bg-card\\/30/g, targetStyle);
  t = t.replace(/bg-bg-card border-l border-fade-border flex flex-col/g, 'border-l flex flex-col ' + targetStyle);
  t = t.replace(/bg-bg-card/g, targetStyle);
  t = t.replace(/border border-fade-border/g, 'border-white/[0.08]');
  t = t.replace(/border-2 border-dashed border-fade-border/g, 'border-2 border-dashed border-white/[0.08]');
  
  if (t !== o) {
    fs.writeFileSync(fullPath, t, 'utf8');
    console.log('Updated ' + fp);
  }
}
