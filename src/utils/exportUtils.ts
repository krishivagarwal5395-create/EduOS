import { SavedItem, Quiz, StudyPlan, LessonPlan, Worksheet, QuestionPaper, RevisionMaterial, Presentation } from '../types';
import pptxgen from 'pptxgenjs';

// Compile detailed text for copying the saved material
export const compileClipboardText = (item: { type: string; title: string; data: any }): string => {
  if (item.type === 'quiz') {
    const q = item.data as Quiz;
    return `${q.title}\n\n${q.questions.map((quest, idx) => `Q${idx+1}: ${quest.question}\nOptions:\n${quest.options.map((o, oIdx) => `  ${["A","B","C","D"][oIdx]}. ${o}`).join('\n')}\nCorrect Answer: Option ${["A","B","C","D"][quest.correctIndex]}\nExplanation: ${quest.explanation}\n`).join('\n')}`;
  }
  if (item.type === 'study-plan') {
    const p = item.data as StudyPlan;
    return `Study Plan: ${item.title}\n\nOverview:\n${p.overview}\n\nSchedule:\n${p.schedule.map(s => `${s.day}: ${s.topics.join(', ')} (${s.duration}) - Notes: ${s.notes}`).join('\n')}\n\nTips:\n${p.tips.map(t => `- ${t}`).join('\n')}`;
  }
  if (item.type === 'lesson-plan') {
    const lp = item.data as LessonPlan;
    let outStr = `Lesson Plan: ${lp.title}\nGrade: ${lp.grade} | Duration: ${lp.duration}\n\n`;
    if (lp.objectives) outStr += `Learning Objectives:\n${lp.objectives.map(o => `- ${o}`).join('\n')}\n\n`;
    if (lp.materials) outStr += `Required Materials:\n${lp.materials.join(', ')}\n\n`;
    
    if (lp.days) {
      outStr += `Unit Plan Breakdown:\n`;
      lp.days.forEach(day => {
        outStr += `\n${day.day}: ${day.topic}\n`;
        if (day.objectives) outStr += `Objectives: ${day.objectives.join(' | ')}\n`;
        if (day.outline) {
          outStr += `Outline:\n${day.outline.map(o => `  ${o.time} - ${o.section}: ${o.activity}`).join('\n')}\n`;
        }
        if (day.homework) outStr += `Homework: ${day.homework}\n`;
        if (day.assessment) outStr += `Assessment: ${day.assessment}\n`;
      });
    } else {
      if (lp.outline) outStr += `Timings Outline:\n${lp.outline.map(o => `${o.time} - ${o.section}: ${o.activity}`).join('\n')}\n\n`;
      if (lp.assessment) outStr += `Formative Assessment:\n${lp.assessment}\n\n`;
      if (lp.homework) outStr += `Homework:\n${lp.homework}`;
    }
    return outStr;
  }
  if (item.type === 'worksheet') {
    const ws = item.data as Worksheet;
    return `Worksheet: ${ws.title}\nInstructions: ${ws.instructions}\n\nQuestions:\n${ws.questions.map((q, idx) => `${idx+1}. ${q}`).join('\n')}\n\nSolutions:\n${ws.solutions.map((s, idx) => `Solution ${idx+1}: ${s}`).join('\n')}`;
  }
  if (item.type === 'question-paper') {
    const qp = item.data as QuestionPaper;
    let text = `${qp.paperTitle}\nGrade: ${qp.grade} | Total Marks: ${qp.totalMarks}`;
    if (qp.duration) text += ` | Duration: ${qp.duration}`;
    if (qp.timings) text += ` | Timings: ${qp.timings}`;
    if (qp.portion) text += `\nPortion / Syllabus: ${qp.portion}`;
    text += `\nInstructions: ${qp.instructions}\n\nSections:\n${qp.sections.map(s => `--- ${s.sectionName} ---\n${s.questions.map((q, idx) => `${idx+1}. ${q.questionText} [${q.marks}] (${q.type})`).join('\n')}`).join('\n\n')}\n\nAnswer Key:\n${qp.answerKey.map(k => `${k.questionNumber}: Answer: ${k.answerText}\nMarking Rule: ${k.markingCriteria}`).join('\n')}`;
    return text;
  }
  if (item.type === 'slip-test') {
    const st = item.data as any;
    let text = `Slip Test: ${st.title}\nGrade: ${st.grade} | Duration: ${st.duration} | Total Marks: ${st.totalMarks}\nInstructions: ${st.instructions}\n\nQuestions:\n`;
    text += st.questions.map((q: any, idx: number) => {
      let qStr = `${q.questionNumber || idx + 1}. ${q.questionText} [${q.marks}] (${q.type})`;
      if (q.options && q.options.length > 0) {
        qStr += `\nOptions: ${q.options.join(', ')}`;
      }
      return qStr;
    }).join('\n\n');
    if (st.answerKey && st.answerKey.length > 0) {
      text += `\n\nAnswer Key & Marking Criteria:\n`;
      text += st.answerKey.map((k: any) => `${k.questionNumber}: Answer: ${k.answerText}\nCriteria: ${k.markingCriteria}`).join('\n');
    }
    return text;
  }
  if (item.type === 'scanned-chapter') {
    return item.data.content;
  }
  if (item.type === 'revision') {
    const rev = item.data as RevisionMaterial;
    return `Revision Sheet: ${rev.title}\n\nKey Concepts:\n${rev.quickNotes.map(n => `- ${n}`).join('\n')}\n\nEssential Terms:\n${rev.formulasOrTerms.map(t => `${t.term}: ${t.definitionOrFormula}`).join('\n')}\n\nCommon Mistakes:\n${rev.commonMistakes.map(m => `- ${m}`).join('\n')}\n\nSample Questions:\n${rev.likelyQuestions.map(q => `Q: ${q.question}\nAnswer Guide: ${q.answerHint}`).join('\n\n')}`;
  }
  if (item.type === 'notebook') {
    const nb = item.data;
    let text = `Notebook Notes: ${nb.topic}\n\nSummary:\n${nb.summary || ''}\n\n`;
    if (nb.sections) {
      text += `Sections:\n${nb.sections.map((s: any) => `${s.heading}\n${s.points.map((p: string) => `- ${p}`).join('\n')}`).join('\n\n')}\n\n`;
    }
    if (nb.keyTerms && nb.keyTerms.length > 0) {
      text += `Key Terms:\n${nb.keyTerms.map((t: any) => `${t.term}: ${t.definition}`).join('\n')}`;
    }
    return text;
  }
  if (item.type === 'presentation') {
    const pres = item.data;
    let text = `Presentation: ${pres.title}\nSubtitle: ${pres.subtitle || ''}\nTheme: ${pres.theme || ''} | Total Slides: ${pres.totalSlides || (pres.slides ? pres.slides.length : 0)}\n\n`;
    if (pres.slides) {
      text += pres.slides.map((s: any) => `--- Slide ${s.slideNumber}: ${s.title} ---\n${s.subtitle ? `Subtitle: ${s.subtitle}\n` : ''}Key Points:\n${s.bulletPoints ? s.bulletPoints.map((b: string) => `- ${b}`).join('\n') : ''}\nVisual Concept: ${s.visualDescription || 'N/A'}${s.keyTakeaway ? `\nTakeaway: ${s.keyTakeaway}` : ''}\n`).join('\n');
    }
    return text;
  }
  if (item.type === 'youtube-script') {
    const yt = item.data;
    let text = `YouTube Video Script: ${yt.title}\nHook: ${yt.hook}\nDuration: ${yt.estimatedDuration} | Target Audience: ${yt.targetAudience}\nTags: ${yt.videoTags ? yt.videoTags.join(', ') : ''}\n\n--- SCENE STORYBOARD & SCRIPT ---\n\n`;
    if (yt.scenes) {
      text += yt.scenes.map((sc: any) => `Scene ${sc.sceneNumber} (${sc.timestamp})\nOn-Screen Visual: ${sc.visualDescription}\nOn-Screen Text: ${sc.onScreenText}\nVoiceover Narration: "${sc.narration}"\nAI Image Prompt: ${sc.aiImagePrompt}\n`).join('\n');
    }
    text += `\nOutro & CTA: ${yt.outroCallToAction}`;
    return text;
  }
  if (item.type === 'youtube-recommendation') {
    const rec = item.data;
    let text = `Curated YouTube Videos: ${rec.topic || item.title}\nGrade Level: ${rec.targetGrade || 'Students'}\nIntegration Strategy: ${rec.overviewNote || ''}\n\n`;
    if (rec.videos) {
      text += rec.videos.map((v: any, idx: number) => `${idx + 1}. ${v.videoTitle} (${v.channelName} - ${v.duration})\nURL: ${v.youtubeUrl || ''}\nSummary: ${v.summary}\nWhy Recommended: ${v.whyRecommended}\n${v.keyTimestamps ? `Timestamps:\n${v.keyTimestamps.map((t: any) => `  - ${t.time}: ${t.topic}`).join('\n')}\n` : ''}${v.discussionQuestions ? `Discussion Questions:\n${v.discussionQuestions.map((q: string) => `  - ${q}`).join('\n')}\n` : ''}`).join('\n');
    }
    return text;
  }
  if (item.type === 'ppt-prompt') {
    const p = item.data;
    return `PPT AI Master Prompt: ${p.lessonTitle || item.title}\nTarget AI: ${p.targetAi || 'AI Presentation Maker'}\nGrade: ${p.grade || ''} | Subject: ${p.subject || ''} | Slides: ${p.slideCount || ''}\n\n--- DROP-IN PROMPT ---\n${p.dropInPrompt || ''}\n\n--- SLIDE BREAKDOWN ---\n${(p.slides || []).map((s: any) => `Slide ${s.slideNumber}: ${s.title}\n- Bullets: ${(s.bulletPoints || []).join('; ')}\n- Visuals: ${s.visualDescription || ''}\n- Script: ${s.speakerNotes || ''}\n`).join('\n')}`;
  }
  if (item.type === 'class-quiz') {
    const q = item.data;
    return `Classroom Interactive Quiz: ${q.quizTitle || item.title}\nChapter: ${q.chapter || ''} | Grade: ${q.grade || ''} | Subject: ${q.subject || ''}\nStatus: ${q.chapterCompleted ? 'Chapter Completed' : 'In Progress'}\n\n--- QUESTIONS ---\n${(q.questions || []).map((quest: any, idx: number) => `Q${idx + 1}: ${quest.question} [${quest.points || 10} pts]\nOptions:\n${(quest.options || []).map((opt: string, oIdx: number) => `  ${String.fromCharCode(65 + oIdx)}. ${opt}`).join('\n')}\nCorrect Answer: Option ${quest.correctOptionLetter || String.fromCharCode(65 + quest.correctOptionIndex)}\nExplanation: ${quest.explanation || ''}\nTeacher Hint: ${quest.teacherHint || ''}\nCommon Misconception: ${quest.commonMisconception || ''}\n`).join('\n')}`;
  }
  if (item.type === 'exam-study-plan') {
    const sp = item.data;
    return `Exam Study Plan: ${sp.planTitle || item.title}\nOverview: ${sp.overview || ''}\nDaily Hours: ${sp.dailyHours || 2} hrs/day | Total Weeks: ${sp.totalWeeks || 3} weeks\nSubjects: ${(sp.subjects || []).join(', ')}\nWeak Areas Emphasized: ${(sp.weakAreas || []).join(', ')}\nBreaks Routine: ${sp.dailyBreakSchedule || ''}\n\n--- WEEKLY SCHEDULE ---\n${(sp.weeks || []).map((w: any) => `=== Week ${w.weekNumber}: ${w.weekGoal} ===\n${(w.days || []).map((d: any) => `\n[${d.day}] ${d.isRevisionDay ? '★ REVISION DAY' : ''}\nBreak: ${d.breakTime}\nNotes: ${d.dailyNotes}\nSessions:\n${(d.sessions || []).map((s: any) => `  * ${s.timeSlot} - ${s.subject} (${s.topic})${s.isWeakAreaFocus ? ' [WEAK SPOT PRIORITY]' : ''}\n    Activities: ${(s.activities || []).join(' | ')}`).join('\n')}`).join('\n')}\n`).join('\n\n')}\n\nTips:\n${(sp.tips || []).map((t: string) => `- ${t}`).join('\n')}`;
  }
  return JSON.stringify(item.data, null, 2);
};

export const handleExportToPDF = (item: { type: string; title: string; data: any }) => {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert("Please allow popups to export or print PDF.");
    return;
  }

  const rawText = compileClipboardText(item);
  let htmlBody = "";

  if (item.type === 'lesson-plan') {
    const lp = item.data as LessonPlan;
    htmlBody = `
      <div class="header">
        <h1>${lp.title || item.title}</h1>
        <div class="meta">
          <span><strong>Grade:</strong> ${lp.grade || 'N/A'}</span>
          <span><strong>Duration:</strong> ${lp.duration || 'N/A'}</span>
        </div>
      </div>
      ${lp.objectives ? `<div class="section"><h2>Learning Objectives</h2><ul>${lp.objectives.map(o => `<li>${o}</li>`).join('')}</ul></div>` : ''}
      ${lp.materials ? `<div class="section"><h2>Required Materials</h2><p>${lp.materials.join(', ')}</p></div>` : ''}
      ${lp.days ? `
        <div class="section"><h2>Unit Plan Schedule</h2>
          ${lp.days.map(d => `
            <div class="card">
              <h3>${d.day}: ${d.topic}</h3>
              ${d.objectives ? `<p><strong>Objectives:</strong> ${d.objectives.join(' | ')}</p>` : ''}
              ${d.outline ? `<table><thead><tr><th>Time</th><th>Section</th><th>Activity</th></tr></thead><tbody>${d.outline.map(o => `<tr><td>${o.time}</td><td>${o.section}</td><td>${o.activity}</td></tr>`).join('')}</tbody></table>` : ''}
              ${d.homework ? `<p><strong>Homework:</strong> ${d.homework}</p>` : ''}
              ${d.assessment ? `<p><strong>Assessment:</strong> ${d.assessment}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : lp.outline ? `
        <div class="section"><h2>Lesson Outline</h2>
          <table><thead><tr><th>Time</th><th>Section</th><th>Activity</th></tr></thead><tbody>${lp.outline.map(o => `<tr><td>${o.time}</td><td>${o.section}</td><td>${o.activity}</td></tr>`).join('')}</tbody></table>
        </div>
      ` : ''}
      ${lp.assessment ? `<div class="section"><h2>Formative Assessment</h2><p>${lp.assessment}</p></div>` : ''}
      ${lp.homework ? `<div class="section"><h2>Homework</h2><p>${lp.homework}</p></div>` : ''}
    `;
  } else if (item.type === 'worksheet') {
    const ws = item.data as Worksheet;
    htmlBody = `
      <div class="header">
        <h1>${ws.title || item.title}</h1>
        <p class="instructions"><strong>Instructions:</strong> ${ws.instructions}</p>
      </div>
      <div class="section">
        <h2>Worksheet Questions</h2>
        <ol class="questions-list">
          ${ws.questions ? ws.questions.map(q => `<li><p>${q}</p><div class="answer-space"></div></li>`).join('') : ''}
        </ol>
      </div>
      <div class="page-break"></div>
      <div class="section">
        <h2>Answer Key & Solutions</h2>
        <ol>
          ${ws.solutions ? ws.solutions.map(s => `<li><p>${s}</p></li>`).join('') : ''}
        </ol>
      </div>
    `;
  } else if (item.type === 'question-paper') {
    const qp = item.data as QuestionPaper;
    htmlBody = `
      <div class="header text-center">
        <h1>${qp.paperTitle || item.title}</h1>
        <div class="meta grid-3">
          <span><strong>Grade:</strong> ${qp.grade}</span>
          <span><strong>Total Marks:</strong> ${qp.totalMarks}</span>
          ${qp.duration ? `<span><strong>Duration:</strong> ${qp.duration}</span>` : ''}
          ${qp.timings ? `<span><strong>Timings:</strong> ${qp.timings}</span>` : ''}
        </div>
        ${qp.portion ? `<p class="portion"><strong>Portion / Syllabus:</strong> ${qp.portion}</p>` : ''}
        <p class="instructions"><strong>General Candidate Instructions:</strong> ${qp.instructions}</p>
      </div>
      <div class="section">
        ${qp.sections ? qp.sections.map(sec => `
          <div class="section-block">
            <h2 class="sec-title">--- ${sec.sectionName} ---</h2>
            <ol>
              ${sec.questions ? sec.questions.map(q => `
                <li class="q-item">
                  <div class="q-head"><span>${q.questionText}</span><strong class="marks">[${q.marks}]</strong></div>
                  ${q.options ? `<div class="options-grid">${q.options.map((o, idx) => `<div><strong>${String.fromCharCode(65+idx)}.</strong> ${o}</div>`).join('')}</div>` : ''}
                </li>
              `).join('') : ''}
            </ol>
          </div>
        `).join('') : ''}
      </div>
      <div class="page-break"></div>
      <div class="section">
        <h2>Answer Key & Marking Criteria</h2>
        <table class="key-table">
          <thead><tr><th>Q. No</th><th>Answer</th><th>Marking Criteria</th></tr></thead>
          <tbody>
            ${qp.answerKey ? qp.answerKey.map(k => `<tr><td><strong>${k.questionNumber}</strong></td><td>${k.answerText}</td><td>${k.markingCriteria}</td></tr>`).join('') : ''}
          </tbody>
        </table>
      </div>
    `;
  } else if (item.type === 'slip-test') {
    const st = item.data;
    htmlBody = `
      <div class="header">
        <h1>Slip Test: ${st.title || item.title}</h1>
        <div class="meta">
          <span><strong>Grade:</strong> ${st.grade}</span>
          <span><strong>Duration:</strong> ${st.duration}</span>
          <span><strong>Total Marks:</strong> ${st.totalMarks}</span>
        </div>
        <p class="instructions"><strong>Instructions:</strong> ${st.instructions}</p>
      </div>
      <div class="section">
        <h2>Questions</h2>
        <div class="q-list">
          ${st.questions ? st.questions.map((q: any, idx: number) => `
            <div class="q-card">
              <div class="q-head">
                <span><strong>${q.questionNumber || `Q${idx+1}`}.</strong> ${q.questionText}</span>
                <strong class="marks">[${q.marks}]</strong>
              </div>
              ${q.options ? `<div class="options-grid">${q.options.map((o: string, oIdx: number) => `<div><strong>${String.fromCharCode(65+oIdx)}.</strong> ${o}</div>`).join('')}</div>` : ''}
              <div class="answer-space"></div>
            </div>
          `).join('') : ''}
        </div>
      </div>
      <div class="page-break"></div>
      <div class="section">
        <h2>Answer Key & Solutions</h2>
        <table>
          <thead><tr><th>Q. No</th><th>Answer</th><th>Marking Criteria</th></tr></thead>
          <tbody>
            ${st.answerKey ? st.answerKey.map((k: any) => `<tr><td><strong>${k.questionNumber}</strong></td><td>${k.answerText}</td><td>${k.markingCriteria}</td></tr>`).join('') : ''}
          </tbody>
        </table>
      </div>
    `;
  } else if (item.type === 'presentation') {
    const pres = item.data;
    htmlBody = `
      <div class="header">
        <h1>Presentation: ${pres.title || item.title}</h1>
        ${pres.subtitle ? `<p class="subtitle">${pres.subtitle}</p>` : ''}
        <div class="meta">
          <span><strong>Target Audience:</strong> ${pres.targetAudience || 'General'}</span>
          <span><strong>Theme:</strong> ${pres.theme || 'Academic'}</span>
          <span><strong>Total Slides:</strong> ${pres.totalSlides || (pres.slides ? pres.slides.length : 0)}</span>
        </div>
      </div>
      <div class="section">
        ${pres.slides ? pres.slides.map((s: any) => `
          <div class="card slide-card" style="margin-bottom: 16px; page-break-inside: avoid; border: 2px solid #cbd5e1;">
            <div style="background: #1e3a8a; color: white; padding: 8px 12px; font-weight: bold; font-size: 14px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between;">
              <span>Slide ${s.slideNumber}: ${s.title}</span>
              ${s.keyTakeaway ? `<span style="font-size: 11px; opacity: 0.9;">Takeaway: ${s.keyTakeaway}</span>` : ''}
            </div>
            <div style="padding: 12px;">
              ${s.subtitle ? `<p style="font-style: italic; font-size: 13px; color: #475569; margin-top: 0;">${s.subtitle}</p>` : ''}
              <ul style="margin: 8px 0;">
                ${s.bulletPoints ? s.bulletPoints.map((b: string) => `<li>${b}</li>`).join('') : ''}
              </ul>
              <div style="background: #f8fafc; padding: 8px; border-radius: 4px; font-size: 12px; margin-top: 8px; border-left: 3px solid #0284c7;">
                <strong>Visual Graphic Concept:</strong> ${s.visualDescription || 'Standard slide visuals'}
              </div>
              <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; font-size: 12px; margin-top: 6px; border-left: 3px solid #6366f1;">
                <strong>Speaker Notes:</strong> ${s.speakerNotes || 'N/A'}
              </div>
            </div>
          </div>
        `).join('') : ''}
      </div>
    `;
  } else if (item.type === 'youtube-script') {
    const yt = item.data;
    htmlBody = `
      <div class="header">
        <h1>YouTube Script: ${yt.title || item.title}</h1>
        <p class="instructions"><strong>Hook / Intro:</strong> ${yt.hook || ''}</p>
        <div class="meta">
          <span><strong>Est. Duration:</strong> ${yt.estimatedDuration || ''}</span>
          <span><strong>Audience:</strong> ${yt.targetAudience || ''}</span>
        </div>
        ${yt.videoTags ? `<p style="font-size: 11px; color: #64748b;"><strong>SEO Tags:</strong> ${yt.videoTags.join(', ')}</p>` : ''}
      </div>
      <div class="section">
        <h2>Scene Storyboard & Script</h2>
        ${yt.scenes ? yt.scenes.map((sc: any) => `
          <div class="card" style="margin-bottom: 14px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1e293b; border-bottom: 1px solid #e2e8f0; pb: 4px; font-size: 13px;">
              <span>Scene ${sc.sceneNumber}</span>
              <span style="color: #0284c7;">${sc.timestamp}</span>
            </div>
            <div style="margin-top: 8px; font-size: 12px;">
              <p style="margin: 4px 0;"><strong>On-Screen Graphic / B-Roll:</strong> ${sc.visualDescription}</p>
              <p style="margin: 4px 0;"><strong>On-Screen Text:</strong> <span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${sc.onScreenText}</span></p>
              <p style="margin: 6px 0; background: #ecfdf5; padding: 8px; border-left: 3px solid #10b981; font-size: 13px;"><strong>Voiceover Narration:</strong> "${sc.narration}"</p>
              <p style="margin: 4px 0; font-size: 11px; color: #64748b;"><strong>AI Art Prompt:</strong> ${sc.aiImagePrompt}</p>
            </div>
          </div>
        `).join('') : ''}
        <div class="instructions" style="background: #f0fdf4; border-color: #10b981; margin-top: 16px;">
          <strong>Outro & Call To Action:</strong> ${yt.outroCallToAction || ''}
        </div>
      </div>
    `;
  } else if (item.type === 'youtube-recommendation') {
    const rec = item.data;
    htmlBody = `
      <div class="header">
        <h1>YouTube Videos: ${rec.topic || item.title}</h1>
        <p class="instructions"><strong>Lesson Integration Strategy:</strong> ${rec.overviewNote || 'N/A'}</p>
        <div class="meta">
          <span><strong>Target Grade:</strong> ${rec.targetGrade || 'Students'}</span>
        </div>
      </div>
      <div class="section">
        <h2>Curated Educational YouTube Videos</h2>
        ${rec.videos ? rec.videos.map((v: any, idx: number) => `
          <div class="card" style="margin-bottom: 14px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1e293b; border-bottom: 1px solid #e2e8f0; pb: 4px; font-size: 13px;">
              <span>${idx + 1}. ${v.videoTitle} (${v.channelName})</span>
              <span style="color: #dc2626;">${v.duration}</span>
            </div>
            <div style="margin-top: 8px; font-size: 12px;">
              <p style="margin: 4px 0;"><strong>Search / URL:</strong> ${v.youtubeUrl || v.searchQuery}</p>
              <p style="margin: 4px 0;"><strong>Summary:</strong> ${v.summary}</p>
              <p style="margin: 6px 0; background: #ecfdf5; padding: 8px; border-left: 3px solid #10b981; font-size: 12px;"><strong>Why Recommended:</strong> ${v.whyRecommended}</p>
              ${v.keyTimestamps && v.keyTimestamps.length > 0 ? `<p style="margin: 4px 0;"><strong>Timestamps:</strong> ${v.keyTimestamps.map((t: any) => `${t.time} (${t.topic})`).join(', ')}</p>` : ''}
              ${v.discussionQuestions && v.discussionQuestions.length > 0 ? `<div style="background: #fffbeb; padding: 8px; border-radius: 4px; margin-top: 6px;"><strong>Discussion Questions:</strong><ul>${v.discussionQuestions.map((q: string) => `<li>${q}</li>`).join('')}</ul></div>` : ''}
            </div>
          </div>
        `).join('') : ''}
      </div>
    `;
  } else if (item.type === 'class-quiz') {
    const q = item.data;
    htmlBody = `
      <div class="header">
        <h1>Classroom Quiz: ${q.quizTitle || item.title}</h1>
        <div class="meta">
          <span><strong>Chapter / Topic:</strong> ${q.chapter || 'N/A'}</span>
          <span><strong>Subject:</strong> ${q.subject || 'N/A'}</span>
          <span><strong>Grade:</strong> ${q.grade || 'N/A'}</span>
          <span><strong>Status:</strong> ${q.chapterCompleted ? 'Chapter Completed ✓' : 'In Progress'}</span>
        </div>
      </div>
      <div class="section">
        <h2>Student Quiz Questions (${(q.questions || []).length} Questions)</h2>
        <div class="q-list">
          ${(q.questions || []).map((quest: any, idx: number) => `
            <div class="q-card">
              <div class="q-head">
                <span><strong>Q${idx + 1}.</strong> ${quest.question}</span>
                <strong class="marks">[${quest.points || 10} pts]</strong>
              </div>
              ${quest.options ? `
                <div class="options-grid">
                  ${quest.options.map((o: string, oIdx: number) => `<div><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${o}</div>`).join('')}
                </div>
              ` : ''}
              <div class="answer-space" style="margin-top: 10px; border-bottom: 1px dotted #cbd5e1; height: 22px;"></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="page-break"></div>
      <div class="section">
        <h2>Teacher Master Answer Key &amp; Pedagogical Rubric</h2>
        <table class="key-table" style="margin-bottom: 16px;">
          <thead><tr><th>Q#</th><th>Correct Option</th><th>Points</th><th>Key Concepts</th></tr></thead>
          <tbody>
            ${(q.questions || []).map((quest: any, idx: number) => `
              <tr>
                <td><strong>Q${idx + 1}</strong></td>
                <td><strong style="color: #059669;">Option ${quest.correctOptionLetter || String.fromCharCode(65 + quest.correctOptionIndex)}</strong>: ${quest.correctAnswerText || quest.options?.[quest.correctOptionIndex] || ''}</td>
                <td>${quest.points || 10} pts</td>
                <td>${(quest.explanation || '').slice(0, 75)}...</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${(q.questions || []).map((quest: any, idx: number) => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid;">
            <div style="font-weight: bold; color: #1e3a8a; font-size: 13px;">Q${idx + 1}: ${quest.question} [${quest.points || 10} pts]</div>
            <div style="margin-top: 4px; font-size: 12px; color: #065f46; font-weight: bold;">
              ✔ Correct Answer: Option ${quest.correctOptionLetter || String.fromCharCode(65 + quest.correctOptionIndex)} — ${quest.correctAnswerText || quest.options?.[quest.correctOptionIndex]}
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #334155;">
              <strong>Rationale &amp; Explanation:</strong> ${quest.explanation || 'N/A'}
            </div>
            ${quest.teacherHint ? `<div style="margin-top: 4px; font-size: 11px; color: #0f766e;"><strong>Teacher Team Hint:</strong> ${quest.teacherHint}</div>` : ''}
            ${quest.commonMisconception ? `<div style="margin-top: 4px; font-size: 11px; color: #be123c;"><strong>Common Misconception:</strong> ${quest.commonMisconception}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } else {
    htmlBody = `
      <div class="header">
        <h1>${item.title}</h1>
      </div>
      <div class="section">
        <pre class="raw-pre">${rawText}</pre>
      </div>
    `;
  }

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${item.title}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .text-center { text-align: center; }
        h1 { font-size: 22px; color: #1e3a8a; margin: 0 0 8px 0; font-weight: 700; }
        h2 { font-size: 16px; color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; }
        h3 { font-size: 14px; color: #1e293b; margin: 10px 0 4px 0; }
        .meta { display: flex; gap: 16px; font-size: 13px; color: #475569; margin-bottom: 6px; }
        .grid-3 { display: flex; justify-content: center; gap: 24px; }
        .instructions, .portion { font-size: 12px; background: #f8fafc; padding: 8px 12px; border-left: 3px solid #2563eb; margin: 8px 0; border-radius: 4px; }
        .section { margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background: #f1f5f9; color: #0f172a; font-weight: 600; }
        .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 10px; }
        .q-item, .q-card { margin-bottom: 12px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; page-break-inside: avoid; }
        .q-head { display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; }
        .marks { color: #1e40af; font-size: 12px; font-weight: bold; }
        .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; font-size: 12px; color: #334155; padding-left: 12px; }
        .answer-space { height: 28px; border-bottom: 1px dotted #cbd5e1; margin-top: 8px; }
        ol, ul { padding-left: 20px; font-size: 13px; }
        li { margin-bottom: 8px; }
        .page-break { page-break-before: always; margin-top: 20px; }
        .raw-pre { white-space: pre-wrap; font-family: monospace; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 6px; }
      </style>
    </head>
    <body>
      ${htmlBody}
    </body>
    </html>
  `;

  printWindow.document.write(fullHTML);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
};

export const handleExportToWord = (item: { type: string; title: string; data: any }) => {
  const text = compileClipboardText(item);
  const htmlContent = text
    .split('\n')
    .map(line => `<p style="font-family: Arial, sans-serif; margin: 0; padding: 2px 0;">${line}</p>`)
    .join('');
    
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>${item.title}</title>
  </head>
  <body>`;
  const footer = `</body></html>`;
    
  const sourceHTML = header + htmlContent + footer;
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = `${item.title.replace(/\s+/g, '_')}.doc`;
  fileDownload.click();
  document.body.removeChild(fileDownload);
};

// Helper to convert image URL to base64 for PPTX embedding
async function getBase64FromImageUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    let res = await fetch(url);
    if (!res.ok) {
      // Fallback via server-side image proxy to bypass any CORS restrictions
      const proxyUrl = `/api/edu/proxy-image?url=${encodeURIComponent(url)}`;
      res = await fetch(proxyUrl);
    }
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    try {
      const proxyUrl = `/api/edu/proxy-image?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch (proxyErr) {
      console.warn("Proxy fallback also failed:", proxyErr);
    }
    return null;
  }
}

export const handleExportToPPTX = async (presentation: Presentation) => {
  try {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";
    pptx.title = presentation.title || "Presentation Deck";

    // Detect Theme Palette from presentation.theme
    const themeName = (presentation.theme || "").toLowerCase();
    
    let palette = {
      bg: "0F172A",          // Slate 900
      cardBg: "1E293B",      // Slate 800
      innerCardBg: "131b2e",
      primary: "6366F1",     // Indigo 500
      accent: "F59E0B",      // Amber 500
      textMain: "FFFFFF",
      textSub: "94A3B8",     // Slate 400
      textAccent: "C7D2FE",  // Indigo 200
      takeawayBg: "1E293B",
      takeawayLine: "F59E0B",
      takeawayText: "FCD34D",
      isLight: false
    };

    if (themeName.includes("academic") || themeName.includes("clean") || themeName.includes("white") || themeName.includes("minimal")) {
      palette = {
        bg: "F8FAFC",          // Slate 50
        cardBg: "EDF2F7",      // Light Slate
        innerCardBg: "FFFFFF",
        primary: "4F46E5",     // Indigo 600
        accent: "0284C7",      // Sky 600
        textMain: "0F172A",    // Slate 900
        textSub: "475569",     // Slate 600
        textAccent: "4338CA",  // Indigo 700
        takeawayBg: "FEF3C7",  // Amber 100
        takeawayLine: "F59E0B",
        takeawayText: "92400E",
        isLight: true
      };
    } else if (themeName.includes("emerald") || themeName.includes("botanical") || themeName.includes("green")) {
      palette = {
        bg: "022C22",          // Deep Emerald 950
        cardBg: "064E3B",      // Emerald 900
        innerCardBg: "04392b",
        primary: "10B981",     // Emerald 500
        accent: "34D399",      // Emerald 400
        textMain: "ECFDF5",
        textSub: "A7F3D0",
        textAccent: "6EE7B7",
        takeawayBg: "064E3B",
        takeawayLine: "10B981",
        takeawayText: "A7F3D0",
        isLight: false
      };
    } else if (themeName.includes("sunset") || themeName.includes("amber") || themeName.includes("warm")) {
      palette = {
        bg: "1C1917",          // Stone 900
        cardBg: "292524",      // Stone 800
        innerCardBg: "1f1b18",
        primary: "F59E0B",     // Amber 500
        accent: "FB923C",      // Orange 400
        textMain: "FFFBEB",
        textSub: "FDE68A",
        textAccent: "FCD34D",
        takeawayBg: "451A03",
        takeawayLine: "F59E0B",
        takeawayText: "FDE68A",
        isLight: false
      };
    } else if (themeName.includes("dark") || themeName.includes("midnight") || themeName.includes("cyber")) {
      palette = {
        bg: "020617",          // Midnight 950
        cardBg: "0F172A",      // Slate 900
        innerCardBg: "080d1a",
        primary: "06B6D4",     // Cyan 500
        accent: "38BDF8",      // Sky 400
        textMain: "F8FAFC",
        textSub: "94A3B8",
        textAccent: "67E8F9",
        takeawayBg: "0F172A",
        takeawayLine: "06B6D4",
        takeawayText: "67E8F9",
        isLight: false
      };
    } else if (themeName.includes("ocean") || themeName.includes("blue")) {
      palette = {
        bg: "082F49",          // Sky 950
        cardBg: "0C4A6E",      // Sky 900
        innerCardBg: "063957",
        primary: "0284C7",     // Sky 600
        accent: "38BDF8",      // Sky 400
        textMain: "F0F9FF",
        textSub: "BAE6FD",
        textAccent: "7DD3FC",
        takeawayBg: "075985",
        takeawayLine: "38BDF8",
        takeawayText: "E0F2FE",
        isLight: false
      };
    }

    // Pre-fetch images in parallel for ultra fast export
    const slidesList = presentation.slides || [];
    const imageBase64List = await Promise.all(
      slidesList.map(async (slide) => {
        if (!slide.imageUrl) {
          const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent((slide.imagePrompt || slide.title || "Education") + ", 4k, crisp, educational photography, high quality")}?width=1024&height=640&nologo=true&seed=${slide.slideNumber * 777}`;
          return await getBase64FromImageUrl(fallbackUrl);
        }
        return await getBase64FromImageUrl(slide.imageUrl);
      })
    );

    // ================= TITLE SLIDE =================
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: palette.bg };

    // Top Accent Bar
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 0.8, w: 8.4, h: 0.1,
      fill: { color: palette.primary }
    });

    // Pill Badge
    titleSlide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.1, w: 2.6, h: 0.35,
      fill: { color: palette.cardBg },
      line: { color: palette.primary, width: 1 }
    });
    titleSlide.addText("PRESENTATION DECK", {
      x: 0.8, y: 1.1, w: 2.6, h: 0.35,
      fontSize: 9, bold: true, color: palette.textAccent, fontFace: "Arial", align: "center"
    });

    // Main Title
    titleSlide.addText(presentation.title || "Presentation Title", {
      x: 0.8, y: 1.6, w: 8.4, h: 1.8,
      fontSize: 32, bold: true, color: palette.textMain, fontFace: "Arial"
    });

    // Subtitle & Theme
    const subParts = [
      presentation.subtitle,
      presentation.theme ? `Theme: ${presentation.theme}` : ''
    ].filter(Boolean).join("  •  ");

    if (subParts) {
      titleSlide.addText(subParts, {
        x: 0.8, y: 3.5, w: 8.4, h: 0.8,
        fontSize: 14, italic: true, color: palette.textSub, fontFace: "Arial"
      });
    }

    // ================= CONTENT SLIDES =================
    slidesList.forEach((slide, idx) => {
      const s = pptx.addSlide();
      s.background = { color: palette.bg };

      // Slide Header Accent Bar
      s.addShape(pptx.ShapeType.rect, {
        x: 0.6, y: 0.35, w: 8.8, h: 0.04,
        fill: { color: palette.primary }
      });

      // Slide Number Pill
      s.addText(`SLIDE ${slide.slideNumber || idx + 1} OF ${slidesList.length}`, {
        x: 0.6, y: 0.45, w: 4.0, h: 0.3,
        fontSize: 9, bold: true, color: palette.textAccent, fontFace: "Arial"
      });

      // Slide Title (Left Column)
      s.addText(slide.title || "Slide Title", {
        x: 0.6, y: 0.75, w: 4.6, h: 0.65,
        fontSize: 18, bold: true, color: palette.textMain, fontFace: "Arial"
      });

      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.6, y: 1.35, w: 4.6, h: 0.3,
          fontSize: 11, italic: true, color: palette.textSub, fontFace: "Arial"
        });
      }

      // Bullet Points (Left Column)
      if (slide.bulletPoints && slide.bulletPoints.length > 0) {
        const bulletObjects = slide.bulletPoints.map(point => ({
          text: point,
          options: { 
            bullet: { type: 'bullet' as const, color: palette.accent }, 
            color: palette.textMain, 
            fontSize: 12, 
            breakLine: true 
          }
        }));
        s.addText(bulletObjects, {
          x: 0.6, y: 1.65, w: 4.6, h: 2.9,
          fontFace: "Arial", lineSpacing: 18
        });
      }

      // RIGHT COLUMN: REALISTIC EDUCATIONAL IMAGE + INFOGRAPHIC CARD
      const rColX = 5.4;
      const rColY = 0.75;
      const rColW = 4.0;
      const imgHeight = 2.4;

      const imgBase64 = imageBase64List[idx];

      // 1. EMBED REAL IMAGE ON EVERY SLIDE
      if (imgBase64) {
        try {
          s.addImage({
            data: imgBase64,
            x: rColX,
            y: rColY,
            w: rColW,
            h: imgHeight,
            rounding: true
          });
        } catch (imgErr) {
          console.warn("Direct base64 embed fallback:", imgErr);
        }
      } else if (slide.imageUrl) {
        try {
          s.addImage({
            path: slide.imageUrl,
            x: rColX,
            y: rColY,
            w: rColW,
            h: imgHeight,
            rounding: true
          });
        } catch (pathErr) {
          console.warn("Direct path embed fallback:", pathErr);
        }
      }

      // 2. DIAGRAM / CONCEPT CARD BELOW THE IMAGE
      const diagY = rColY + imgHeight + 0.15;
      const diagH = 1.3;

      s.addShape(pptx.ShapeType.roundRect, {
        x: rColX, y: diagY, w: rColW, h: diagH,
        fill: { color: palette.cardBg },
        line: { color: palette.primary, width: 1 }
      });

      const graphicTitle = slide.graphicTitle || (slide.graphicType ? `${slide.graphicType.toUpperCase()} ARCHITECTURE` : "KEY VISUAL CONCEPT");
      s.addText(`📊 ${graphicTitle}`, {
        x: rColX + 0.15, y: diagY + 0.08, w: rColW - 0.3, h: 0.25,
        fontSize: 9, bold: true, color: palette.textAccent, fontFace: "Arial"
      });

      const elements = slide.graphicElements && slide.graphicElements.length > 0
        ? slide.graphicElements.slice(0, 2)
        : (slide.bulletPoints || []).slice(0, 2).map((b, i) => ({
            label: b.split(/[:\-–]/)[0]?.trim() || `Concept ${i + 1}`,
            description: b.split(/[:\-–]/)[1]?.trim() || b
          }));

      elements.forEach((el, elI) => {
        const itemY = diagY + 0.35 + (elI * 0.45);
        s.addShape(pptx.ShapeType.roundRect, {
          x: rColX + 0.15, y: itemY, w: rColW - 0.3, h: 0.4,
          fill: { color: palette.innerCardBg },
          line: { color: palette.primary, width: 0.5 }
        });

        s.addText(`• ${el.label}: ${el.description ? el.description.slice(0, 45) : ''}`, {
          x: rColX + 0.25, y: itemY + 0.05, w: rColW - 0.5, h: 0.3,
          fontSize: 8.5, color: palette.textMain, fontFace: "Arial"
        });
      });

      // Bottom Key Takeaway Box
      if (slide.keyTakeaway) {
        s.addShape(pptx.ShapeType.roundRect, {
          x: 0.6, y: 4.75, w: 8.8, h: 0.5,
          fill: { color: palette.takeawayBg },
          line: { color: palette.takeawayLine, width: 1 }
        });
        s.addText(`💡 KEY TAKEAWAY: ${slide.keyTakeaway}`, {
          x: 0.7, y: 4.8, w: 8.6, h: 0.4,
          fontSize: 10, bold: true, color: palette.takeawayText, fontFace: "Arial"
        });
      }
    });

    const safeTitle = (presentation.title || "presentation").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    await pptx.writeFile({ fileName: `${safeTitle}.pptx` });
  } catch (err) {
    console.error("Failed to generate PPTX file:", err);
    alert("Failed to create PPTX file.");
  }
};

/**
 * Dedicated Teacher Master Answer Key & Rubric PDF Export
 */
export const handleExportTeacherAnswerKeyPDF = (quiz: any, customTitle?: string) => {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert("Please allow popups to export or print the Teacher Answer Key PDF.");
    return;
  }

  const title = customTitle || quiz.quizTitle || "Classroom Quiz - Teacher Answer Key";
  const questions = quiz.questions || [];

  const htmlBody = `
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #fde68a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
            🔒 Confidential Teacher Master Key
          </span>
          <h1 style="margin: 4px 0 6px 0; color: #1e3a8a; font-size: 22px;">${title}</h1>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          <div><strong>Total Questions:</strong> ${questions.length}</div>
          <div><strong>Total Marks:</strong> ${questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0)} pts</div>
        </div>
      </div>
      <div class="meta" style="margin-top: 8px;">
        <span><strong>Chapter / Topic:</strong> ${quiz.chapter || 'N/A'}</span>
        <span><strong>Subject:</strong> ${quiz.subject || 'Curriculum'}</span>
        <span><strong>Grade:</strong> ${quiz.grade || 'General'}</span>
        <span><strong>Status:</strong> ${quiz.chapterCompleted ? 'Chapter Completed ✓' : 'In Progress'}</span>
      </div>
    </div>

    <!-- Quick Grading Answer Key Matrix Table -->
    <div class="section">
      <h2 style="font-size: 15px; color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-top: 10px;">
        📊 Master Answer Key Matrix (Quick Grading Reference)
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9; color: #0f172a;">
            <th style="border: 1px solid #cbd5e1; padding: 8px; width: 60px;">Q#</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; width: 90px;">Answer</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; width: 70px;">Points</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Core Explanation / Pedagogical Rule</th>
          </tr>
        </thead>
        <tbody>
          ${questions.map((q: any, idx: number) => {
            const letter = q.correctOptionLetter || String.fromCharCode(65 + (q.correctOptionIndex ?? 0));
            const answerText = q.correctAnswerText || (q.options && q.options[q.correctOptionIndex]) || '';
            return `
              <tr style="${idx % 2 === 1 ? 'background: #f8fafc;' : ''}">
                <td style="border: 1px solid #cbd5e1; padding: 7px; text-align: center; font-weight: bold;">Q${idx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 7px; font-weight: bold; color: #059669; text-align: center;">
                  Option ${letter}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 7px; text-align: center; font-weight: 500;">${q.points || 10} pts</td>
                <td style="border: 1px solid #cbd5e1; padding: 7px; color: #334155;">
                  <strong>${answerText.replace(/^[A-D]\)\s*/, '')}</strong> — ${(q.explanation || '').slice(0, 100)}${(q.explanation || '').length > 100 ? '...' : ''}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Detailed Pedagogical Breakdown per Question -->
    <div class="section" style="margin-top: 20px;">
      <h2 style="font-size: 15px; color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 4px;">
        📝 Complete Question Rationale, Team Hints & Student Misconceptions
      </h2>
      ${questions.map((q: any, idx: number) => {
        const letter = q.correctOptionLetter || String.fromCharCode(65 + (q.correctOptionIndex ?? 0));
        const correctIndex = q.correctOptionIndex ?? (letter.charCodeAt(0) - 65);
        return `
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 14px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="font-size: 13.5px; font-weight: bold; color: #0f172a;">
                Q${idx + 1}: ${q.question}
              </span>
              <span style="background: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; shrink-0; margin-left: 8px;">
                ${q.points || 10} Points
              </span>
            </div>

            <!-- Options Grid with highlighted correct answer -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0 10px 0; font-size: 12px;">
              ${(q.options || []).map((opt: string, oIdx: number) => {
                const isCorrect = oIdx === correctIndex;
                return `
                  <div style="padding: 6px 10px; border-radius: 6px; border: 1px solid ${isCorrect ? '#10b981' : '#e2e8f0'}; background: ${isCorrect ? '#ecfdf5' : '#f8fafc'}; color: ${isCorrect ? '#065f46' : '#475569'}; font-weight: ${isCorrect ? 'bold' : 'normal'};">
                    ${String.fromCharCode(65 + oIdx)}. ${opt.replace(/^[A-D]\)\s*/, '')} ${isCorrect ? ' ✔ [CORRECT]' : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Explanations & Notes Box -->
            <div style="background: #f8fafc; border-left: 3px solid #10b981; padding: 8px 12px; border-radius: 0 6px 6px 0; font-size: 12px; margin-bottom: 6px;">
              <strong style="color: #065f46;">🧠 Solution Explanation & Rationale:</strong>
              <p style="margin: 3px 0 0 0; color: #334155; line-height: 1.45;">${q.explanation || 'Direct answer explanation.'}</p>
            </div>

            ${q.teacherHint ? `
              <div style="background: #f0fdfa; border-left: 3px solid #0d9488; padding: 6px 10px; border-radius: 0 4px 4px 0; font-size: 11.5px; margin-bottom: 4px;">
                <strong style="color: #0f766e;">💡 Team Clue / Teacher Prompt:</strong>
                <span style="color: #134e4a; margin-left: 4px;">${q.teacherHint}</span>
              </div>
            ` : ''}

            ${q.commonMisconception ? `
              <div style="background: #fff1f2; border-left: 3px solid #f43f5e; padding: 6px 10px; border-radius: 0 4px 4px 0; font-size: 11.5px;">
                <strong style="color: #be123c;">⚠️ Common Student Pitfall / Misconception:</strong>
                <span style="color: #881337; margin-left: 4px;">${q.commonMisconception}</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - Teacher Answer Key</title>
      <style>
        @page { size: A4; margin: 16mm; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .meta { display: flex; gap: 16px; font-size: 12.5px; color: #475569; flex-wrap: wrap; }
        .section { margin-bottom: 18px; }
      </style>
    </head>
    <body>
      ${htmlBody}
    </body>
    </html>
  `;

  printWindow.document.write(fullHTML);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
};

/**
 * Dedicated Teacher Master Answer Key & Rubric Word Export (.doc)
 */
export const handleExportTeacherAnswerKeyWord = (quiz: any, customTitle?: string) => {
  const title = customTitle || quiz.quizTitle || "Classroom Quiz - Teacher Answer Key";
  const questions = quiz.questions || [];

  let textContent = `TEACHER MASTER ANSWER KEY & PEDAGOGICAL RUBRIC\n`;
  textContent += `Title: ${title}\n`;
  textContent += `Chapter: ${quiz.chapter || 'N/A'} | Subject: ${quiz.subject || 'Curriculum'} | Grade: ${quiz.grade || 'General'}\n`;
  textContent += `Status: ${quiz.chapterCompleted ? 'Chapter Completed' : 'In Progress'}\n`;
  textContent += `Total Questions: ${questions.length} | Generated: ${new Date().toLocaleDateString()}\n\n`;
  
  textContent += `================== MASTER GRADING MATRIX ==================\n`;
  questions.forEach((q: any, idx: number) => {
    const letter = q.correctOptionLetter || String.fromCharCode(65 + (q.correctOptionIndex ?? 0));
    textContent += `Q${idx + 1}: Option ${letter} (${q.points || 10} pts)\n`;
  });
  textContent += `\n================== DETAILED RUBRIC & HINTS ==================\n\n`;

  questions.forEach((q: any, idx: number) => {
    const letter = q.correctOptionLetter || String.fromCharCode(65 + (q.correctOptionIndex ?? 0));
    const correctText = q.correctAnswerText || (q.options && q.options[q.correctOptionIndex]) || '';
    textContent += `------------------------------------------------------------\n`;
    textContent += `Q${idx + 1}: ${q.question} [${q.points || 10} Points]\n`;
    textContent += `Options:\n`;
    (q.options || []).forEach((opt: string, oIdx: number) => {
      const isCorr = oIdx === (q.correctOptionIndex ?? (letter.charCodeAt(0) - 65));
      textContent += `  [${String.fromCharCode(65 + oIdx)}] ${opt.replace(/^[A-D]\)\s*/, '')} ${isCorr ? '✔ (CORRECT)' : ''}\n`;
    });
    textContent += `\nCORRECT ANSWER: Option ${letter} - ${correctText.replace(/^[A-D]\)\s*/, '')}\n`;
    textContent += `EXPLANATION: ${q.explanation || 'N/A'}\n`;
    if (q.teacherHint) textContent += `TEACHER TEAM HINT: ${q.teacherHint}\n`;
    if (q.commonMisconception) textContent += `COMMON PITFALL: ${q.commonMisconception}\n`;
    textContent += `\n`;
  });

  const htmlContent = textContent
    .split('\n')
    .map(line => `<p style="font-family: Arial, sans-serif; margin: 0; padding: 2px 0;">${line}</p>`)
    .join('');
    
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>${title} - Teacher Answer Key</title>
  </head>
  <body>`;
  const footer = `</body></html>`;
    
  const sourceHTML = header + htmlContent + footer;
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = `${title.replace(/\s+/g, '_')}_Teacher_Answer_Key.doc`;
  fileDownload.click();
  document.body.removeChild(fileDownload);
};
