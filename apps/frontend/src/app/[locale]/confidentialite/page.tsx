import type { Metadata } from 'next'
import { LEGAL, SUPPORT_EMAIL, SITE_URL } from '@/lib/brand'
import LegalPage from '@/components/legal/LegalPage'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Politique de confidentialité — Etabib',
    description: 'Politique de confidentialité de la plateforme Etabib, conforme à la loi marocaine 09-08.',
    alternates: { canonical: `${SITE_URL}/${locale}/confidentialite` },
  }
}

export default async function ConfidentialitePage({ params }: Props) {
  const { locale } = await params

  return (
    <LegalPage locale={locale} title="Politique de confidentialité">
      <h2>Qui est responsable du traitement de vos données ?</h2>
      <p>
        Concernant les données des patients, le praticien ou le cabinet médical
        utilisateur de la plateforme Etabib est seul responsable du traitement au sens
        de la loi n° 09-08. {LEGAL.raisonSociale} intervient uniquement en tant que
        sous-traitant technique, chargé de l&apos;hébergement sécurisé de ces données.
      </p>
      <p>
        Concernant les données des praticiens et cabinets clients eux-mêmes (compte,
        facturation), {LEGAL.raisonSociale} est responsable du traitement.
      </p>

      <h2>Quelles données sont collectées ?</h2>
      <ul>
        <li>Données d&apos;identification du praticien/cabinet (nom, email, téléphone, spécialité)</li>
        <li>
          Données patients saisies par le praticien dans le cadre de la gestion clinique
          (identité, coordonnées, antécédents, consultations, ordonnances, vaccinations)
        </li>
        <li>Données de facturation</li>
      </ul>

      <h2>Pourquoi ces données sont-elles collectées ?</h2>
      <p>
        Uniquement pour permettre la gestion administrative et clinique du cabinet
        médical via la plateforme, et la facturation de l&apos;abonnement souscrit.
      </p>

      <h2>Où vos données sont-elles hébergées ?</h2>
      <p>
        L&apos;ensemble des données de santé est hébergé exclusivement sur le territoire
        marocain, conformément à la loi 09-08, sans transfert vers l&apos;étranger.
      </p>

      <h2>Combien de temps vos données sont-elles conservées ?</h2>
      <p>
        Les données patients sont conservées pendant toute la durée de la relation entre
        le patient et le cabinet médical, conformément aux obligations légales de
        conservation des dossiers médicaux au Maroc. Les données de compte praticien
        sont conservées pendant la durée de l&apos;abonnement, puis archivées ou
        supprimées sur demande après résiliation.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi 09-08, toute personne concernée dispose d&apos;un droit
        d&apos;accès, de rectification et, dans les conditions prévues par la loi,
        d&apos;opposition ou de suppression des données la concernant. Pour un patient,
        cette demande doit être adressée directement au cabinet médical qui le suit.
        Pour un praticien/cabinet client, la demande peut être adressée à{' '}
        {SUPPORT_EMAIL}.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site utilise uniquement des cookies strictement nécessaires au fonctionnement
        du service :
      </p>
      <ul>
        <li>payload-token : maintien de la session de connexion praticien</li>
        <li>NEXT_LOCALE : mémorisation de la langue choisie</li>
      </ul>
      <p>
        Aucun cookie publicitaire ni traceur d&apos;analyse tiers n&apos;est utilisé à
        ce jour.
      </p>

      <h2>Contact</h2>
      <p>Pour toute question relative à cette politique : {SUPPORT_EMAIL}</p>

      <p className="pt-4 text-sm text-stone-500">
        Dernière mise à jour : [DATE À COMPLÉTER AU MOMENT DE LA PUBLICATION]
      </p>
    </LegalPage>
  )
}
