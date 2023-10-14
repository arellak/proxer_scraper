# proxer_scraper
Get your watch history from proxer.me

## How to get necessary cookies
1. Go to proxer.me
2. Login if you are not already
3. Open the developer tools (F12)
4. Go to the Application tab
5. On the left side, click on Cookies
6. Copy the joomla_remember_me_xxx key and value
7. Copy the cookie whose name is just gibberish and value is a long string of numbers and letters

## How to use
1. Install dependencies with `npm install`
2. Copy `cookie.example.txt` to `cookie.txt` and fill in the values (see above)
3. Run `npm run start`
4. The output will be in `output/history.json`