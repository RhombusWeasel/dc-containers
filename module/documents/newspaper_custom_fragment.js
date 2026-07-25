/**
 * Custom fragment dialog and template token reference for the newspaper editor.
 */

const { DialogV2 } = foundry.applications.api;

function localize(key) {
  return game.i18n.localize(`dc.containers.doc.${key}`);
}

/**
 * HTML reference for Handlebars-style tokens resolved at drop time.
 * @returns {string}
 */
function custom_fragment_token_help_html() {
  const groups = [
    {
      title: localize('editor_custom_tokens_location'),
      tokens: [
        ['{{city}}', 'editor_custom_tokens_city'],
        ['{{state}}', 'editor_custom_tokens_state'],
        ['{{territory}}', 'editor_custom_tokens_territory'],
      ],
    },
    {
      title: localize('editor_custom_tokens_paper'),
      tokens: [
        ['{{paper_name}}', 'editor_custom_tokens_paper_name'],
        ['{{editor_name}}', 'editor_custom_tokens_editor_name'],
      ],
    },
    {
      title: localize('editor_custom_tokens_crime'),
      tokens: [
        ['{{crime.headline}}', 'editor_custom_tokens_crime_headline'],
        ['{{crime.article}}', 'editor_custom_tokens_crime_article'],
        ['{{crime.count}}', 'editor_custom_tokens_crime_count'],
        ['{{sentence.text}}', 'editor_custom_tokens_sentence'],
        ['{{number}}', 'editor_custom_tokens_number'],
        ['{{number.sub_1}}', 'editor_custom_tokens_number_sub'],
      ],
    },
    {
      title: localize('editor_custom_tokens_characters'),
      tokens: [
        ['{{culprit.name.full}}', 'editor_custom_tokens_culprit_name'],
        ['{{culprit.pronoun.subjective}}', 'editor_custom_tokens_pronoun_subj'],
        ['{{culprit.pronoun.objective}}', 'editor_custom_tokens_pronoun_obj'],
        ['{{culprit.pronoun.clause}}', 'editor_custom_tokens_pronoun_clause'],
        ['{{culprit.age}}', 'editor_custom_tokens_age'],
        ['{{witness.name.full}}', 'editor_custom_tokens_witness'],
        ['{{officer.name.full}}', 'editor_custom_tokens_officer'],
      ],
    },
    {
      title: localize('editor_custom_tokens_subject'),
      tokens: [
        ['{{subject.animal}}', 'editor_custom_tokens_subject_animal'],
        ['{{subject.building}}', 'editor_custom_tokens_subject_building'],
        ['{{subject.contraband}}', 'editor_custom_tokens_subject_contraband'],
        ['{{subject.product}}', 'editor_custom_tokens_subject_product'],
      ],
    },
    {
      title: localize('editor_custom_tokens_phrases'),
      tokens: [
        ['{{cunning}}', 'editor_custom_tokens_cunning'],
        ['{{captures}}', 'editor_custom_tokens_captures'],
        ['{{captured}}', 'editor_custom_tokens_captured'],
        ['{{dastardly}}', 'editor_custom_tokens_dastardly'],
        ['{{plea_for_order}}', 'editor_custom_tokens_plea'],
        ['{{spooky_possession}}', 'editor_custom_tokens_spooky'],
        ['{{random.animal}}', 'editor_custom_tokens_random_animal'],
        ['{{random.colour}}', 'editor_custom_tokens_random_colour'],
      ],
    },
  ];

  const escape = foundry.utils.escapeHTML;
  return groups.map((group) => {
    const rows = group.tokens.map(([token, hint_key]) =>
      `<tr><td><code>${escape(token)}</code></td><td>${escape(localize(hint_key))}</td></tr>`,
    ).join('');
    return `<section class="dc-custom-fragment-token-group"><h4>${escape(group.title)}</h4><table>${rows}</table></section>`;
  }).join('');
}

/**
 * Show the custom fragment editor dialog.
 * @param {Object} [existing]
 * @param {string} [existing.label]
 * @param {string} [existing.text]
 * @returns {Promise<{ label: string, text: string }|null>}
 */
async function show_custom_fragment_dialog(existing = {}) {
  const escape = foundry.utils.escapeHTML;
  const label = escape(existing.label || localize('editor_custom_fragment_default'));
  const text = escape(existing.text || '');

  try {
    return await DialogV2.prompt({
      classes: ['deadlands-classic', 'dc-dialog', 'dc-custom-fragment-dialog', 'themed', 'theme-light'],
      window: {
        title: localize('editor_custom_fragment_title'),
        icon: 'fa-solid fa-pen',
      },
      position: { width: 520 },
      content: `
        <div class="dc-custom-fragment-form">
          <p class="editor-hint">${escape(localize('editor_custom_fragment_intro'))}</p>
          <label class="editor-field">
            <span>${escape(localize('editor_custom_fragment_label'))}</span>
            <input type="text" name="fragment_label" value="${label}" autofocus>
          </label>
          <label class="editor-field">
            <span>${escape(localize('editor_custom_fragment_text'))}</span>
            <textarea name="fragment_text" rows="8" placeholder="${escape(localize('editor_custom_fragment_placeholder'))}">${text}</textarea>
          </label>
          <details class="dc-custom-fragment-help" open>
            <summary>${escape(localize('editor_custom_fragment_tokens'))}</summary>
            <div class="dc-custom-fragment-help-scroll">
              <p class="editor-hint">${escape(localize('editor_custom_fragment_tokens_hint'))}</p>
              ${custom_fragment_token_help_html()}
            </div>
          </details>
        </div>
      `,
      ok: {
        label: localize('editor_custom_fragment_save'),
        callback: (_event, button) => {
          const form = button.form;
          const next_label = form.elements.fragment_label.value.trim();
          const next_text = form.elements.fragment_text.value;
          if (!next_label) return null;
          return { label: next_label, text: next_text };
        },
      },
    });
  } catch {
    return null;
  }
}

export {
  show_custom_fragment_dialog,
  custom_fragment_token_help_html,
};
