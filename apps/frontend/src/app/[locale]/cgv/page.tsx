import type { Metadata } from 'next'
import { LEGAL, SITE_URL } from '@/lib/brand'
import LegalPage from '@/components/legal/LegalPage'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Conditions Générales de Vente et d&apos;Utilisation — Etabib',
    description: 'Conditions Générales de Vente et d&apos;Utilisation de la plateforme Etabib au Maroc.',
    alternates: { canonical: `${SITE_URL}/${locale}/cgv` },
  }
}

export default async function CgvPage({ params }: Props) {
  const { locale } = await params

  return (
    <LegalPage locale={locale} title="Conditions Générales de Vente et d&apos;Utilisation">
      <h2>Article 1 — Objet</h2>
      <p>
        Les présentes Conditions Générales régissent l&apos;utilisation de la plateforme
        Etabib, service de gestion de cabinet médical édité par {LEGAL.raisonSociale},
        accessible via etabibi.ma et ses sous-domaines de cabinets clients.
      </p>

      <h2>Article 2 — Description des offres</h2>
      <table>
        <thead>
          <tr>
            <th>Formule</th>
            <th>Tarif</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vitrine</td>
            <td>Gratuite</td>
            <td>Site vitrine public pour le cabinet médical</td>
          </tr>
          <tr>
            <td>RDV</td>
            <td>199 MAD/mois</td>
            <td>Vitrine + prise de rendez-vous en ligne</td>
          </tr>
          <tr>
            <td>Cabinet</td>
            <td>499 MAD/mois (+ 199 MAD/mois par médecin supplémentaire)</td>
            <td>Gestion complète du cabinet : dossiers patients, consultations, ordonnances, file d&apos;attente</td>
          </tr>
        </tbody>
      </table>
      <p>
        Les tarifs sont exprimés en dirhams marocains (MAD), hors taxes éventuellement
        applicables selon la réglementation en vigueur.
      </p>

      <h2>Article 3 — Souscription</h2>
      <p>
        La souscription à une formule payante nécessite la création d&apos;un compte
        praticien et la validation des présentes CGV. L&apos;accès aux fonctionnalités
        correspondantes est activé après confirmation du paiement.
      </p>

      <h2>Article 4 — Facturation et paiement</h2>
      <p>
        La facturation est mensuelle, sans engagement de durée. Le client peut résilier
        à tout moment ; la résiliation prend effet à la fin de la période de facturation
        en cours, sans remboursement au prorata sauf disposition contraire convenue
        expressément.
      </p>

      <h2>Article 5 — Obligations du client</h2>
      <p>Le praticien ou cabinet médical utilisateur reste seul responsable :</p>
      <ul>
        <li>de l&apos;exactitude des informations saisies dans les dossiers patients,</li>
        <li>du respect des règles déontologiques applicables à sa profession,</li>
        <li>de la confidentialité de ses identifiants de connexion.</li>
      </ul>

      <h2>Article 6 — Obligations d&apos;Etabib</h2>
      <p>{LEGAL.raisonSociale} s&apos;engage à :</p>
      <ul>
        <li>maintenir une disponibilité raisonnable du service,</li>
        <li>assurer la sauvegarde régulière des données hébergées,</li>
        <li>mettre en œuvre des mesures de sécurité conformes à la loi 09-08.</li>
      </ul>

      <h2>Article 7 — Propriété et responsabilité des données de santé</h2>
      <p>
        Les données patients saisies sur la plateforme demeurent la propriété exclusive
        du praticien ou du cabinet médical, seul responsable du traitement au sens de la
        loi 09-08. {LEGAL.raisonSociale} agit en qualité de sous-traitant technique,
        chargé uniquement de l&apos;hébergement et du fonctionnement de la plateforme.
      </p>

      <h2>Article 8 — Limitation de responsabilité</h2>
      <p>
        {LEGAL.raisonSociale} ne saurait être tenu responsable des dommages indirects
        résultant de l&apos;utilisation du service, ni d&apos;une interruption de service
        due à un cas de force majeure ou à un tiers (hébergeur, fournisseur
        d&apos;accès internet).
      </p>

      <h2>Article 9 — Résiliation</h2>
      <p>
        Chaque partie peut résilier à tout moment, sans préavis, pour une formule sans
        engagement. En cas de manquement grave aux présentes conditions,{' '}
        {LEGAL.raisonSociale} se réserve le droit de suspendre ou résilier l&apos;accès
        au service.
      </p>

      <h2>Article 10 — Droit applicable et juridiction compétente</h2>
      <p>
        Les présentes CGV sont soumises au droit marocain. Tout litige relève de la
        compétence exclusive des tribunaux du Royaume du Maroc.
      </p>

      <p className="pt-4 text-sm text-stone-500">
        Dernière mise à jour : [DATE À COMPLÉTER AU MOMENT DE LA PUBLICATION]
      </p>
    </LegalPage>
  )
}
