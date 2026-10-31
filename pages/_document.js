import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta
          name="description"
          content="See how your stock portfolio moved today, with gains, dividends and option chains."
        ></meta>
      </Head>
      <body className="bg-paper text-ink">
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              const theme = localStorage.getItem('theme');
              if (theme !== 'light') {
                document.documentElement.classList.add('dark');
              }
            })();
          `
          }}
        ></script>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
