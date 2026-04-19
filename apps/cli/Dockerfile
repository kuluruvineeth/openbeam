FROM gcr.io/distroless/static-debian12:nonroot

ARG TARGETPLATFORM
COPY $TARGETPLATFORM/openbeam /usr/local/bin/openbeam

USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/openbeam"]
CMD ["--help"]

LABEL org.opencontainers.image.title="openbeam" \
      org.opencontainers.image.description="OpenBeam CLI — enterprise search and AI assistant" \
      org.opencontainers.image.source="https://github.com/kuluruvineeth/openbeam" \
      org.opencontainers.image.licenses="MIT"
