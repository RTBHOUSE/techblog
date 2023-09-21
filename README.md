# RTB House Tech Blog

RTB House Tech Blog Jekyll sources.

Live version: https://techblog.rtbhouse.com/

## Editing

### Traditional (non-Docker) version

Set up the environment:

    sudo apt install ruby-dev ruby-bundler
    gem install -v 2.1.4 bundler
    bundle _2.1.4_ install

Preview changes:

    bundle _2.1.4_ exec jekyll serve

### Docker version

It's better to use tools in versions matching those used by GitHub Pages. As of the time of writing GitHub Pages uses Ruby 2.7.4 and bundler 2.1.4.
Current list of software stack components with version numbers is located at https://pages.github.com/versions.json.
To solve this problem we have created a Dockerfile that has software components in preferred versions installed.

We use two containers:
- `github-pages` - for testing, updates, gems management
- `github-pages-serve` - to locally run Jekyll serve to previev out blog

To build above containers run:

    docker build --progress=plain --target github-pages -t github-pages .
    docker build --progress=plain --target github-pages-serve -t github-pages-serve .

To run a container with Ruby and Jekyll:

    docker run -v $(pwd):/site -t -i --entrypoint /bin/bash github-pages

To install required Gems inside container:

    bundle _2.1.4_ install --retry 5 --jobs 20

To run local Jekyll server to preview the blog:

    docker run -t -i -p 4000:4000 -v $(pwd):/site github-pages-serve

Then open URL http://127.0.0.1:4000/ in your web browser.

# Publishing changes

    git add ...
    git commit
    git pull --rebase
    git push
