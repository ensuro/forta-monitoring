# Instructions for a new release

```sh
npm version patch
git push && git push --tags
```

This will bump the version in `package.json`, commit, create a new tag, push and trigger the [github workflow](https://github.com/ensuro/forta-monitoring/actions/workflows/publish.yaml) that publishes the new version to Forta's network.
