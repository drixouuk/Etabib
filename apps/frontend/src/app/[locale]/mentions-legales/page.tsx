import type { Metadata } from 'next'
import { LEGAL, SUPPORT_EMAIL, SITE_URL } from '@/lib/brand'
import LegalPage from '@/components/legal/LegalPage'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Mentions légales — Etabib',
    description: 'Mentions légales de la plateforme Etabib, service de gestion de cabinet médical au Maroc.',
    alternates: { canonical: `${SITE_URL}/${locale}/mentions-legales` },
  }
}

export default async function MentionsLegalesPage({ params }: Props) {
  const { locale } = await params

  return (
    <LegalPage locale={locale} title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        {LEGAL.raisonSociale}, {LEGAL.formeJuridique}
      </p>
      <p>{LEGAL.capitalSocial ? `Capital social : ${LEGAL.capitalSocial}` : ''}</p>
      <p>
        RC : {LEGAL.rc} — ICE : {LEGAL.ice}
      </p>
      <p>Siège social : {LEGAL.siegeSocial}</p>
      <p>Directeur de la publication : {LEGAL.responsablePublication}</p>
      <p>Contact : {SUPPORT_EMAIL}</p>

      <h2>Hébergement</h2>
      <p>
        Ce site ainsi que les données de santé traitées par la plateforme Etabib sont
        hébergés exclusivement sur le territoire marocain, conformément à la loi n°
        09-08 relative à la protection des personnes physiques à l&apos;égard du
        traitement des données à caractère personnel. {LEGAL.hebergeur}
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur ce site (textes, graphismes, logo,
        marque Etabib) est protégé par le droit d&apos;auteur et le droit des marques.
        Toute reproduction, même partielle, est interdite sans autorisation préalable
        écrite de l&apos;éditeur.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Ce site peut contenir des liens vers des sites tiers. L&apos;éditeur n&apos;exerce
        aucun contrôle sur ces sites et décline toute responsabilité quant à leur
        contenu.
      </p>

      <h2>Droit applicable</h2>
      <p>Les présentes mentions légales sont soumises au droit marocain.</p>

      <p className="pt-4 text-sm text-stone-500">
        Dernière mise à jour : [DATE À COMPLÉTER AU MOMENT DE LA PUBLICATION]
      </p>
    </LegalPage>
  )
}
