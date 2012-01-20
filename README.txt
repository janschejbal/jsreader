JSReader by Jan Schejbal


Usage:
  1. Create a HTML file containing divs of the classes folderpane, listpane
  and viewpane and optionally maintitle (see messagepane.html for a good
  example). You are absolutely free to place any other elements on the page!
  
  2. Include jsreader.css, jsreader.js and create a new  MessageSystem,
  passing the DIV elements and the username of the current user (for
  highlighting).
  
  3. Call init(url) on the MessageSystem, passing the URL of the main
  description JSON file
  
File formats:
  Main description JSON file:
    - folders: An array of folder objects, each consisting of
        id: string - unique folder id
        name: string - visible folder name
        dataurl: string - URL to foldercontent-JSON
        expanded: bool - initial state (expanded/collapsed)
        children: optional array of folder objects
    - settings: An object with settings to override defaults. May be empty,
      but must be present! The following settings are available:
        title: string       - shown in title tag and element
        autoMarkRead: bool  - mark msgs read when clicked,
        showSender: bool    - display sender column
        showDate: bool      - display date column
        showScore: bool     - display score column
        allowReply: bool    - show reply button
        allowVoting: bool   - show voting buttons
        allowInterest: bool - show interest (watch/ignore) buttons
        readOnExpand: bool  - mark top msg as read when expanding
        textsurl: string    - URL where missing texts can be retrieved.
		                      A POST request will be issued to this URL when
							  missing texts need to be loaded. The POST has
							  a single parameter "ids" containing a comma-
							  separated list of message IDs.
							  The response needs to be a texts JSON file
							  as described below.
  
  Folder content JSON file:
    - messages: Array of message objects, each consisting of:
        id: string       - unique id of the message. should be unique, even
                           across folders, otherwise it will be considered
                           to be the same message. (As seen in the example!)
                           Absolutely MUST be unique inside the folder.
        subject: string  - message subject
        sender: string   - author of the message. Messages belonging to the
                           current user as specified in the constructor of
                           MessageSystem will be highlighted.
        date: string     - Date of the message. Can probably be abused for
                           any other purpose.
        score: int       - score of the message, including the user's own
                           vote if applicable. May be used for scoring
                           (automatic ignoring)
        children: array  - array of strings representing the IDs of the
                           immediate children of the messages
        text: string     - Valid, safe HTML to show as the message content
                           when the message is opened. You MUST correctly
                           escape any user input in this, or you will be
                           vulnerable to XSS attacks.
						   If null, the text will be downloaded when needed
						   from the specified textsurl URL (see above)
        attributes: obj. - optional object that can contain the following
                           attributes (missing means false or 0):
            read: boolean    - true, if message has been read
            starred: boolean - true, if message has been starred
            vote: int        - -1, 0 or 1
            interest: int    - -1, 0, 1 (-1 means ignored, 1 watched)
        settings: object - optional object that can override the settings
                           allowReply, allowVote and allowInterest
    - rootMessages: Array of message-IDs (strings) of the messages that lie
                    directly in the folder.       
    - settings: like in the main description JSON file, overrides those

  Texts JSON file:
    Consists of an array of objects, each having "id" and "text".
		id: string   - the ID of the message to which the text belongs
		text: string - the message content (safe HTML - see above!)
    The server may send more texts than requested.
	
Highlighting:
  Underlined: Collapsed thread containing unread messages
  Green shadow/glow: Collapsed thread containing own messages
  Bold: Unread
  Green: Own message
  Blue: Watched message
  