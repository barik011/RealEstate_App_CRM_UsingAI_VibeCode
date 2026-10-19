import { useEffect, useState } from 'react';
import { contentService } from '../../../services/contentService';
import { CONTENT_FIELDS, CONTENT_LABELS, validateContent } from '../../../services/contentRules';
import { Button, Field, FormDialog, PageHeading, Panel } from '../components/UI';
import { useToast } from '../../../components/ui';
export function Website() {
  const [kind, setKind] = useState('site');
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const [reload, setReload] = useState(0);
  const load = () => setReload((value) => value + 1);
  useEffect(() => {
    let active = true;
    setRecord(null);
    setError('');
    contentService
      .load(kind)
      .then((v) => {
        if (active) setRecord(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [kind, reload]);
  const update = (data) => setRecord({ ...record, data });
  const save = async (publish) => {
    setBusy(true);
    setError('');
    try {
      setRecord(await contentService.save(kind, record.data, record.version, publish));
      toast(
        publish ? 'Website content published.' : 'Draft saved. The public website is unchanged.',
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const site = kind === 'site' && record?.data;
  return (
    <>
      <PageHeading
        title="Website content"
        subtitle="Manage homepage settings, communities, categories, articles and testimonials. Save a draft or publish it to the website."
      />
      <Panel title="Content editor">
        <div className="crm-pad crm-stack">
          <Field
            label="Content collection"
            value={kind}
            onChange={(e) => {
              setRecord(null);
              setKind(e.target.value);
              setEditing(null);
            }}
            options={Object.entries(CONTENT_LABELS)}
            disabled={busy}
          />
          <p>
            Publish applies only to the selected collection. Reload discards unsaved edits. Use
            genuine business information and client testimonials with permission.
          </p>
          {error && (
            <p role="alert" className="crm-error">
              {error}
            </p>
          )}
          {!record ? (
            <Button secondary onClick={load}>
              Reload content
            </Button>
          ) : (
            <>
              {site ? (
                <div className="crm-form-grid">
                  {[
                    ['brand', 'Website brand'],
                    ['email', 'Public contact email'],
                    ['phone', 'Public contact phone'],
                    ['heroTitle', 'Homepage headline'],
                    ['heroDescription', 'Homepage introduction'],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={site[key] || ''}
                      onChange={(e) => update({ ...site, [key]: e.target.value })}
                    />
                  ))}
                  <Field
                    label="Properties per page"
                    type="number"
                    min="3"
                    max="30"
                    value={site.paginationSize}
                    onChange={(e) => update({ ...site, paginationSize: Number(e.target.value) })}
                  />
                  <Field
                    label="Hero images (one HTTPS URL per line)"
                    type="textarea"
                    value={site.heroImages.join('\n')}
                    onChange={(e) => update({ ...site, heroImages: e.target.value.split('\n') })}
                  />
                  {Object.entries(site.socials).map(([key, value]) => (
                    <Field
                      key={key}
                      label={`${key} URL`}
                      type="url"
                      value={value}
                      onChange={(e) =>
                        update({ ...site, socials: { ...site.socials, [key]: e.target.value } })
                      }
                    />
                  ))}
                  {[
                    ['compareEnabled', 'Allow property comparison'],
                    ['savedSearchesEnabled', 'Allow saved searches on this device'],
                    ['advancedFiltersEnabled', 'Show detailed property filters'],
                  ].map(([key, label]) => (
                    <label className="crm-check" key={key}>
                      <input
                        type="checkbox"
                        checked={site[key] !== false}
                        onChange={(e) => update({ ...site, [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <Button
                    onClick={() =>
                      setEditing({
                        index: -1,
                        item: kind === 'testimonials' ? { id: crypto.randomUUID(), rating: 5 } : {},
                      })
                    }
                  >
                    Add item
                  </Button>
                  {record.data.map((item, index) => (
                    <div className="crm-content-item" key={item.slug || item.id}>
                      <div>
                        <strong>{item.name || item.title}</strong>
                        <p>{item.slug || item.role}</p>
                      </div>
                      <div className="crm-actions">
                        <Button secondary onClick={() => setEditing({ index, item })}>
                          Edit {item.name || item.title}
                        </Button>
                        <Button
                          secondary
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...record.data];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            update(next);
                          }}
                        >
                          Move up
                        </Button>
                        <Button
                          secondary
                          disabled={index === record.data.length - 1}
                          onClick={() => {
                            const next = [...record.data];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            update(next);
                          }}
                        >
                          Move down
                        </Button>
                        <Button danger onClick={() => setEditing({ index, item, remove: true })}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="crm-actions">
                <Button secondary disabled={busy} onClick={() => save(false)}>
                  Save draft
                </Button>
                <Button disabled={busy} onClick={() => save(true)}>
                  Publish website content
                </Button>
                <Button secondary disabled={busy} onClick={load}>
                  Reload content
                </Button>
                <a href="/" target="_blank" rel="noreferrer">
                  View website
                </a>
              </div>
            </>
          )}
        </div>
      </Panel>
      {editing &&
        (editing.remove ? (
          <FormDialog
            title="Remove content item"
            submitLabel="Remove from draft"
            onClose={() => setEditing(null)}
            onSubmit={() => {
              update(record.data.filter((_, i) => i !== editing.index));
              setEditing(null);
            }}
          >
            <p className="crm-full">
              Remove {editing.item.name || editing.item.title}? This takes effect publicly only
              after publishing.
            </p>
          </FormDialog>
        ) : (
          <FormDialog
            title={editing.index < 0 ? 'Add content item' : 'Edit content item'}
            submitLabel="Apply to draft"
            onClose={() => setEditing(null)}
            onSubmit={(fields) => {
              const item = { ...editing.item, ...fields };
              for (const [key, , type] of CONTENT_FIELDS[kind])
                if (type === 'lines')
                  item[key] = fields[key]
                    .split('\n')
                    .map((v) => v.trim())
                    .filter(Boolean);
              validateContent(kind, [item]);
              const next = [...record.data];
              if (editing.index < 0) next.push(item);
              else next[editing.index] = item;
              validateContent(kind, next);
              update(next);
              setEditing(null);
            }}
          >
            {CONTENT_FIELDS[kind].map(([key, label, type]) => (
              <Field
                key={key}
                label={label}
                name={key}
                required
                type={type === 'lines' ? 'textarea' : type || 'text'}
                defaultValue={
                  Array.isArray(editing.item[key])
                    ? editing.item[key].join('\n')
                    : editing.item[key] || ''
                }
              />
            ))}
          </FormDialog>
        ))}
    </>
  );
}
