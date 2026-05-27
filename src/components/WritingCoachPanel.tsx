/**
 * WritingCoachPanel - UI component for Writing Coach
 * Part of Self-Evolution Writing Coach (Direction C)
 */
import { useState, useEffect } from 'react';
import { useBudgetStore, getBudgetSummary, estimateTokens } from '../stores/budgetStore';
import { analyzeText } from '../coach/WritingStyleAnalyzer';
import { getTopSkills, getSkillStats } from '../coach/StyleCrystallizer';
import { getSuggestionsForContext } from '../coach/AdaptiveSuggestions';

export function WritingCoachPanel() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeText> | null>(null);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof getSuggestionsForContext>>([]);
  const budgetSummary = getBudgetSummary();
  const skillStats = getSkillStats();
  const topSkills = getTopSkills(3);
  const { isOverBudget, isOverDailyLimit, startDocument, endDocument, recordUsage } = useBudgetStore();

  useEffect(() => {
    startDocument('coach-' + Date.now());
    return () => endDocument();
  }, [startDocument, endDocument]);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const result = analyzeText(text);
    setAnalysis(result);

    const sugg = getSuggestionsForContext(text, text.length, {
      dominantTone: result.dominantTone,
      readabilityScore: result.readabilityScore,
    });
    setSuggestions(sugg);

    const tokens = estimateTokens(text);
    recordUsage(tokens);
  };

  const handleClearText = () => {
    setText('');
    setAnalysis(null);
    setSuggestions([]);
  };

  const budgetPercentage = budgetSummary.config.tokensPerDocument > 0
    ? ((budgetSummary.config.tokensPerDocument - budgetSummary.documentRemaining) / budgetSummary.config.tokensPerDocument) * 100
    : 0;

  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid #22d3ee33', borderRadius: 8, background: '#0a1a2a' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#22d3ee' }}>✍️ Self-Evolution Writing Coach</h3>

      {/* Budget Status */}
      <div style={{ marginBottom: 12, padding: 8, borderRadius: 6, background: isOverBudget || isOverDailyLimit ? '#2a1a1a' : '#12121a' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Token Budget</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#333', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${budgetPercentage}%`, height: '100%', background: budgetPercentage > 80 ? '#ff6b6b' : '#22d3ee', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11, color: budgetPercentage > 80 ? '#ff6b6b' : '#888' }}>
            {budgetSummary.documentRemaining.toLocaleString()} / {budgetSummary.config.tokensPerDocument.toLocaleString()}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          Daily: {budgetSummary.dailyRemaining.toLocaleString()} remaining
          {isOverBudget && <span style={{ color: '#ff6b6b' }}> ⚠️ Document limit reached</span>}
          {isOverDailyLimit && <span style={{ color: '#ff6b6b' }}> ⚠️ Daily limit reached</span>}
        </div>
      </div>

      {/* Text Input */}
      <div style={{ marginBottom: 12 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze your writing style..."
          style={{ width: '100%', minHeight: 100, padding: 10, borderRadius: 6, border: '1px solid #333', background: '#1a1a2e', color: '#f0f0f5', fontSize: 13, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={handleAnalyze} style={{ padding: '8px 16px', background: '#22d3ee', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Analyze</button>
          <button onClick={handleClearText} style={{ padding: '8px 16px', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Clear</button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: '#12121a' }}>
          <div style={{ fontSize: 13, color: '#22d3ee', marginBottom: 8 }}>📊 Analysis</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, color: '#aaa' }}>
            <div>Words: <span style={{ color: '#fff' }}>{analysis.wordCount}</span></div>
            <div>Sentences: <span style={{ color: '#fff' }}>{analysis.sentenceCount}</span></div>
            <div>Paragraphs: <span style={{ color: '#fff' }}>{analysis.paragraphCount}</span></div>
            <div>Readability: <span style={{ color: '#fff' }}>{analysis.readabilityScore.toFixed(0)}</span></div>
            <div>Tone: <span style={{ color: '#fff' }}>{analysis.dominantTone}</span></div>
            <div>Avg Word: <span style={{ color: '#fff' }}>{analysis.avgWordLength.toFixed(1)}</span></div>
          </div>
          {analysis.styleFlags.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11 }}>
              <span style={{ color: '#888' }}>Style: </span>
              {analysis.styleFlags.map((flag, i) => (
                <span key={i} style={{ padding: '2px 6px', background: '#22d3ee22', color: '#22d3ee', borderRadius: 4, marginRight: 4 }}>{flag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: '#12121a' }}>
          <div style={{ fontSize: 13, color: '#f97316', marginBottom: 8 }}>💡 Suggestions</div>
          {suggestions.slice(0, 5).map((sugg, i) => (
            <div key={i} style={{ padding: '6px 8px', marginBottom: 4, background: '#1a1a2e', borderRadius: 4, fontSize: 12 }}>
              <span style={{ color: '#f97316' }}>[{sugg.type}]</span> {sugg.text}
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{sugg.reason} (confidence: {(sugg.confidence * 100).toFixed(0)}%)</div>
            </div>
          ))}
        </div>
      )}

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <div style={{ padding: 10, borderRadius: 6, background: '#12121a' }}>
          <div style={{ fontSize: 13, color: '#a855f7', marginBottom: 8 }}>⭐ Crystallized Skills ({skillStats.total})</div>
          {topSkills.map((skill, i) => (
            <div key={i} style={{ padding: '6px 8px', marginBottom: 4, background: '#1a1a2e', borderRadius: 4, fontSize: 12 }}>
              <span style={{ color: '#a855f7' }}>{skill.name}</span>
              <span style={{ color: '#666', marginLeft: 8 }}>⏱️ {skill.usageCount} uses | effectiveness: {skill.effectiveness.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}