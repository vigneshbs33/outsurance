'use client';

import React, { useState } from 'react';
import { ExternalLink, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { FlatReview } from '../lib/reviews';

export function ForumReviewCard({ review }: { review: FlatReview }) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = review.sentiment === 'positive';
  const isNegative = review.sentiment === 'negative';

  return (
    <article className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{review.insurer}</p>
          <h3 className="text-sm font-black text-neutral-900 leading-snug">{review.plan_name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isNegative
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            {isPositive ? <ThumbsUp size={10} /> : isNegative ? <ThumbsDown size={10} /> : null}
            {review.sentiment}
          </span>
          <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-full">
            {review.platform}
          </span>
        </div>
      </div>

      <p className="text-sm font-bold text-neutral-800 leading-snug">{review.review_summary}</p>
      <p className={`text-xs text-neutral-600 leading-relaxed mt-2 ${expanded ? '' : 'line-clamp-3'}`}>
        {review.detailed_review}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-bold text-[#0078fd] hover:underline"
        >
          {expanded ? 'Show less' : 'Read full review'}
        </button>
        {review.source_url && (
          <a
            href={review.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-emerald-700"
          >
            Source <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  );
}
