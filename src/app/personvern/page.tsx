import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Personvern - Qrydex',
    description: 'Qrydex personvernerklæring. Ingen sporing, ingen cookies.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[var(--color-background)] py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto bg-[var(--color-surface)] rounded-2xl shadow-xl p-8 sm:p-12 border border-[var(--color-border)]">
                <header className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-[var(--color-text)] mb-4">Personvern hos Qrydex</h1>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium border border-green-200">
                        🛡️ Ingen sporing. Ingen cookies.
                    </div>
                </header>

                <div className="space-y-8 text-[var(--color-text)] leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-[var(--color-primary)]">Vi tracker deg ikke</h2>
                        <p className="text-[var(--color-text-secondary)]">
                            Qrydex er en bedrifts-søkemotor bygget på tillit. Vi tror ikke på å overvåke brukerne våre.
                            Når du søker hos oss, logger vi ikke IP-adressen din, vi lagrer ikke søkehistorikken din knyttet til deg som person,
                            og vi selger ingen data om din adferd til tredjeparter.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-[var(--color-primary)]">Ingen Cookies</h2>
                        <p className="text-[var(--color-text-secondary)]">
                            Vi bruker <strong>ingen funksjonelle cookies</strong> eller markedsførings-cookies.
                            Den eneste gangen vi lagrer noe lokalt i nettleseren din, er for å huske dine preferanser for siden:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--color-text-secondary)]">
                            <li>Hvis du velger "Dark Mode", husker vi dette valget (lagret i `localStorage`).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-[var(--color-primary)]">Offentlig Data</h2>
                        <p className="text-[var(--color-text-secondary)]">
                            Informasjonen vi viser om bedrifter er utelukkende basert på offentlig tilgjengelig data fra registre som
                            Brønnøysundregistrene, selskapsregistre i USA/Europa, og åpne nettsider. Vi sammenstiller denne informasjonen
                            for å gjøre B2B-markedet mer transparent.
                        </p>
                    </section>

                    <hr className="border-[var(--color-border)] my-8" />

                    <div className="text-center">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Har du spørsmål om personvern eller ønsker informasjon om din bedrift fjernet?
                            <br />
                            <a href="mailto:privacy@qrydex.com" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
                                Kontakt oss på privacy@qrydex.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
