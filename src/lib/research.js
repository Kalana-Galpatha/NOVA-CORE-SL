// Research library: real NASA records behind each health risk shown in the app.
// Every link goes to a NASA Technical Reports Server (NTRS) record. "finding" is a short
// paraphrase of the record's own abstract or summary, not a quote. The app's alert numbers
// are its own tiers; these papers back the topic, not each threshold.

const ntrs = (id) => `https://ntrs.nasa.gov/citations/${id}`;

export const RESEARCH = [
  {
    id: 'bone', risk: 'Bone loss', indicator: 'bone',
    papers: [
      {
        title: 'Recovery of Spaceflight-induced Bone Loss: Bone Mineral Density after Long-Duration Missions as Fitted with an Exponential Function',
        source: 'NASA Johnson Space Center', id: '20070032016',
        finding: 'After 4 to 6 month missions, average bone mineral loss ranged from 2 to 9 percent depending on the site. The model predicts half of it returns within about 9 months.',
      },
      {
        title: 'Risk of Bone Fracture due to Spaceflight-induced Changes to Bone (2023 evidence report)',
        source: 'NASA Human Research Program', id: '20240005190',
        finding: 'Longer flights are linked to a higher rate of hip and spine fractures, and routine DXA scans do not capture the full loss and recovery.',
      },
    ],
  },
  {
    id: 'vision', risk: 'Vision changes (SANS)', indicator: 'vision',
    papers: [
      {
        title: 'Evidence Report: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)',
        source: 'NASA Human Research Program', id: '20180000936',
        finding: 'A subset of astronauts develop eye and brain structural and functional changes during long flights.',
      },
      {
        title: 'Spaceflight Associated Neuro-Ocular Syndrome (SANS): 2023 Clinical Update',
        source: 'NASA Johnson Space Center', id: '20220014606',
        finding: 'About two thirds of long-duration crew show the earliest sign of SANS. Optic disc swelling is the most common finding.',
      },
    ],
  },
  {
    id: 'radiation', risk: 'Radiation', indicator: 'cumdose',
    papers: [
      {
        title: 'Evidence Report: Risk of Radiation Carcinogenesis',
        source: 'NASA Human Research Program', id: '20160004369',
        finding: 'Cancer risk from space radiation is a main hindrance to deep space travel: the estimates are very uncertain and no simple countermeasure exists.',
      },
      {
        title: 'NASA Space Cancer Risk Model: 2020 Operational Implementation',
        source: 'NASA Johnson Space Center', id: '20210013314',
        finding: 'Describes the model NASA uses to calculate each astronaut\'s risk of exposure-induced cancer and death, which sets exposure limits.',
      },
    ],
  },
  {
    id: 'sleep', risk: 'Sleep and fatigue', indicator: 'sleep',
    papers: [
      {
        title: 'Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload',
        source: 'NASA Human Research Program', id: '20150016964',
        finding: 'Astronauts consistently sleep less in flight than on the ground. Ground studies tie that to lower performance and health effects.',
      },
    ],
  },
].map((r) => ({ ...r, papers: r.papers.map((p) => ({ ...p, url: ntrs(p.id) })) }));
