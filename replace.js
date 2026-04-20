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

for (const fp of filesToProcess) {
  const fullPath = path.join(__dirname, fp);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  let oldContent = content;

  // Replacements
  content = content.replace(/border-fade-border bg-main/g, 'border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card border border-fade-border/g, targetStyle);
  content = content.replace(/border border-fade-border bg-bg-card/g, targetStyle);
  content = content.replace(/bg-bg-card\/50 backdrop-blur-md/g, targetStyle);
  content = content.replace(/bg-bg-card\/60 backdrop-blur-xl/g, targetStyle);
  content = content.replace(/border-l border-fade-border flex flex-col bg-bg-card\/30/g, 'border-l flex flex-col bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card\/30/g, 'bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card border-l border-fade-border flex flex-col/g, 'border-l flex flex-col ' + targetStyle);
  content = content.replace(/bg-bg-card/g, targetStyle);
  content = content.replace(/border border-fade-border/g, 'border-white/[0.08]');
  content = content.replace(/border-2 border-dashed border-fade-border/g, 'border-2 border-dashed border-white/[0.08]');

  // Cleanup overlaps
  content = content.replace(/border border-white\/\[0\.08\] border-white\/\[0\.08\]/g, 'border border-white/[0.08]');
  content = content.replace(/border-white\/\[0\.08\] border border-white\/\[0\.08\]/g, 'border border-white/[0.08]');
  content = content.replace(/border border-white\/\[0\.08\] bg-white\/\[0\.04\] backdrop-blur-\[12px\] border border-white\/\[0\.08\] shadow-\[0_4px_24px_rgba\(0,0,0,0\.25\)\]/g, targetStyle);
  
  // Extra cleanups (fixing edge cases from previous overlapping regex)
  content = content.replace(new RegExp("border-white/\\\\[0\\\\.08\\\\] bg-white/\\\\[0\\\\.04\\\\] backdrop-blur-\\\\[12px\\\\] shadow-\\\\[0_4px_24px_rgba\\\\(0,0,0,0\\\\.25\\\\)\\\\] border border-white/\\\\[0\\\\.08\\\\]", "g"), targetStyle);

  if (content !== oldContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated ' + fp);
  }
}const fs = require('fs');
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

for (const fp of filesToProcess) {
  const fullPath = path.join(__dirname, fp);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  let oldContent = content;

  // Replacements
  content = content.replace(/border-fade-border bg-main/g, 'border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card border border-fade-border/g, targetStyle);
  content = content.replace(/border border-fade-border bg-bg-card/g, targetStyle);
  content = content.replace(/bg-bg-card\/50 backdrop-blur-md/g, targetStyle);
  content = content.replace(/bg-bg-card\/60 backdrop-blur-xl/g, targetStyle);
  content = content.replace(/border-l border-fade-border flex flex-col bg-bg-card\/30/g, 'border-l flex flex-col bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card\/30/g, 'bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card border-l border-fade-border flex flex-col/g, 'border-l flex flex-col ' + targetStyle);
  content = content.replace(/bg-bg-card/g, targetStyle);
  content = content.replace(/border border-fade-border/g, 'border-white/[0.08]');
  content = content.replace(/border-2 border-dashed border-fade-border/g, 'border-2 border-dashed border-white/[0.08]');

  // Cleanup overlaps
  content = content.replace(/border border-white\/\[0\.08\] border-white\/\[0\.08\]/g, 'border border-white/[0.08]');
  content = content.replace(/border-white\/\[0\.08\] border border-white\/\[0\.08\]/g, 'border border-white/[0.08]');
  content = content.replace(/border border-white\/\[0\.08\] bg-white\/\[0\.04\] backdrop-blur-\[12px\] border border-white\/\[0\.08\] shadow-\[0_4px_24px_rgba\(0,0,0,0\.25\)\]/g, targetStyle);
  
  if (content !== oldContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated ' + fp);
  }
}
const fs = require('fs');
const path = require('path');

const targetStyle = 'bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]';

const filesToProcess = [
  'frontend/src/components/workspace/WorkspaceHome.tsx',
  'frontend/src/components/workspace/ResourceItem.tsx',
  'frontend/src/components/workspace/ResourcesView.tsx',
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
  'frontend/src/app/(dashboard)/settings/subscription/page.tsx',
  'frontend/src/components/dashboard/CollapsibleSidebar.tsx'
];

for (const fp of filesToProcess) {
  const fullPath = path.join(__dirname, fp);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  let oldContent = content;

  // Replacements
  content = content.replace(/border-fade-border bg-main/g, 'border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/border-fade-border bg-bg-card\/60 backdrop-blur-xl/g, targetStyle);
  content = content.replace(/border-fade-border bg-bg-card\/50 backdrop-blur-xl/g, targetStyle);
  content = content.replace(/border-fade-border bg-bg-card/g, targetStyle);
  content = content.replace(/bg-bg-card border border-fade-border/g, targetStyle);
  content = content.replace(/bg-bg-card\/50 backdrop-blur-md/g, targetStyle);
  content = content.replace(/bg-bg-card\/60 backdrop-blur-xl/g, targetStyle);
  content = content.replace(/border-l border-fade-border flex flex-col bg-bg-card\/30/g, 'border-l border-white/[0.08] flex flex-col bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card\/30/g, 'bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]');
  content = content.replace(/bg-bg-card border-l border-fade-border flex flex-col/g, 'border-l flex flex-col ' + targetStyle);
  content = content.replace(/bg-bg-card/g, targetStyle);
  content = content.replace(/border border-fade-border/g, 'border-white/[0.08]');
  content = content.replace(/border-2 border-dashed border-fade-border/g, 'border-2 border-dashed border-white/[0.08]');

  // Cleanup potential overlaps
  content = content.replace(/'bg-white\/\[0\.04\] backdrop-blur-\[12px\] border border-white\/\[0\.08\] shadow-\[0_4px_24px_rgba\(0,0,0,0\.25\)\] border-white\/\[0\.08\]'/g, `'${targetStyle}'`);
  content = content.replace(/"bg-white\/\[0\.04\] backdrop-blur-\[12px\] border border-white\/\[0\.08\] shadow-\[0_4px_24px_rgba\(0,0,0,0\.25\)\] border-white\/\[0\.08\]"/g, `"${targetStyle}"`);
  content = content.replace(/border border-white\/\[0\.08\] border-white\/\[0\.08\]/g, 'border border-white/[0.08]');
  content = content.replace(/border-white\/\[0\.08\] border border-white\/\[0\.08\]/g, 'border border-white/[0.08]');
  content = content.replace(/border border-white\/\[0\.08\] bg-white\/\[0\.04\] backdrop-blur-\[12px\] border border-white\/\[0\.08\] shadow-\[0_4px_24px_rgba\(0,0,0,0\.25\)\]/g, targetStyle);
  
  if (content !== oldContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated ' + fp);
  }
}
const fs = require("fs");
const path = require("path");
const targetStyle = "bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]";
const filesToProcess = [
  "frontend/src/components/workspace/WorkspaceHome.tsx",
  "frontend/src/components/workspace/ResourceItem.tsx",
  "frontend/src/components/workspace/ResourcesView.tsx",
  "frontend/src/components/workspace/Chattie.tsx",
  "frontend/src/components/workspace/SummarizationView.tsx",
  "frontend/src/components/workspace/summarization/ResultsPhase.tsx",
  "frontend/src/components/workspace/FlashcardsView.tsx",
  "frontend/src/components/workspace/study-room/StudyRoomView.tsx",
  "frontend/src/components/workspace/QuizView.tsx",
  "frontend/src/components/workspace/quiz/QuizCard.tsx",
  "frontend/src/components/workspace/quiz/QuizResultsView.tsx",
  "frontend/src/app/(dashboard)/settings/layout.tsx",
  "frontend/src/app/(dashboard)/settings/page.tsx",
  "frontend/src/app/(dashboard)/settings/profile/page.tsx",
  "frontend/src/app/(dashboard)/settings/preferences/page.tsx",
  "frontend/src/app/(dashboard)/settings/subscription/page.tsx"
];
for (const fp of filesToProcess) {
  const fullPath = path.join(__dirname, fp);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf8");
  let oldContent = content;
  content = content.replace(/border-fade-border bg-bg-card/g, targetStyle);
  content = content.replace(/border-fade-border bg-main/g, "border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]");
  content = content.replace(/bg-bg-card border border-fade-border/g, targetStyle);
  content = content.replace(/bg-bg-card\\/50 backdrop-blur-md border border-fade-border/g, targetStyle);
  content = content.replace(/bg-bg-card\\/50 backdrop-blur-md/g, targetStyle);
  content = content.replace(/bg-bg-card\\/60 backdrop-blur-xl border border-fade-border/g, targetStyle);
  content = content.replace(/bg-bg-card\\/60 backdrop-blur-xl/g, targetStyle);
  content = content.replace(/border-l border-fade-border flex flex-col bg-bg-card\\/30/g, "border-l border-white/[0.08] flex flex-col bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]");
  content = content.replace(/bg-bg-card\\/30/g, "bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]");
  content = content.replace(/bg-bg-card/g, targetStyle);
  content = content.replace(/border border-fade-border/g, "border-white/[0.08]");
  content = content.replace(/border-2 border-dashed border-white\\/\\[0\\.08\\] bg-white\\/\\[0\\.04\\] backdrop-blur-\\[12px\\] border border-white\\/\\[0\\.08\\] shadow-\\[0_4px_24px_rgba\\(0\\,0\\,0\\,0\\.25\\)\\]/g, "border-2 border-dashed border-white/[0.08] bg-white/[0.04] backdrop-blur-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.25)]");
  if (content !== oldContent) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log("Updated " + fullPath);
  }
}
