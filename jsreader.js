/*
	JSReader by Jan Schejbal
	
	Note: Everything related to interest/ignoring is currently incomplete and/or horribly broken.
	
*/

var MessageHelper = {
	createDiv: function(classname, parent, text) {
			var d = document.createElement("div");
			if (classname) d.className = classname;
			if (parent) parent.appendChild(d);
			if (text) d.textContent = text;
			return d;
		},
		
	simpleObjectClone: function(orig) {
			var cloned = {}
			for (var name in orig) cloned[name] = orig[name];
			return cloned;
		}
};

function MessageAttributeMemoryStore() {
	this.store = {}
	
	try {
		if (localStorage.getItem("antragsviewerdata-testbpt112")) this.store = JSON.parse(localStorage.getItem("antragsviewerdata-testbpt112"));
	} catch (e) {} // ignore
	
	this.setAttribute = function(msgid, name, value) {
		if (!this.store[msgid]) this.store[msgid] = {};
		this.store[msgid][name] = value;
		try {
			localStorage.setItem("antragsviewerdata-testbpt112", JSON.stringify(this.store));
		} catch (e) {} // ignore
	}
	
	this.getAttributes = function(msgid) {
		if (this.store[msgid]) {
			return MessageHelper.simpleObjectClone(this.store[msgid]);
		} else {
			return {};
		}
	}
}

function MessageSystem(maintitle, folderpane, listpane, viewpane, currentuser) {
	var thisobj = this; // use in handlers where "this" is replaced to point to event source

	this.maintitleelement = maintitle;
	this.folderpane = folderpane;
	this.listpane = listpane;
	this.viewpane = viewpane;
	this.currentuser = currentuser;
	
	this.selected = null;
	this.foldercontentmanager = null;
	
	this.attributeStore = new MessageAttributeMemoryStore();
	
	this.init = function(dataurl) {
		this.folderpane.innerHTML = 'Loading...';
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open('GET', dataurl, true);
		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState == 4) {
				var responseJSON = JSON.parse(xmlHttp.responseText);
				thisobj.folders = responseJSON.folders;
				thisobj.settings = {
					title: "Message view",
					autoMarkRead: true,
					showSender: true,
					showDate: true,
					showScore: true,
					allowReply: true,
					allowVoting: true,
					allowInterest: false,
					readOnExpand: false
				}
				for (var name in responseJSON.settings) {
					thisobj.settings[name] = responseJSON.settings[name];
				}
				thisobj.setTitle(thisobj.settings.title);
				if (thisobj.folders) thisobj.renderFolders();
			}
		};
		xmlHttp.send(null);
	}
	
	this.setTitle = function(title) {
		document.title = title;
		if (this.maintitleelement) this.maintitleelement.textContent = title;
	}
	
	this.renderFolders = function() {
		this.folderpane.innerHTML = "";
		for (var i = 0; i < this.folders.length; i++) {
			var f = new Folder(this.folders[i], this);
			this.folderpane.appendChild(f.htmlinstance.main);
		}
	}
	
	this.selectFolder = function(folder) {
		if (this.selected) {
			this.selected.selected = false;
			this.selected.updateClass();
		}
		this.selected = folder;
		if (folder) {
			folder.selected = true;
			folder.updateClass();
			this.foldercontentmanager = new FolderContentManager(this);
			this.foldercontentmanager.init(folder.dataurl);
		}
	}
}

function Folder(jsonFolder, msgsys) {
	var thisobj = this; // use in handlers where "this" is replaced to point to event source
	
	this.msgsys = msgsys;

    this.id = jsonFolder.id;
	this.name = jsonFolder.name;
	this.dataurl = jsonFolder.dataurl;
	this.children = [];
	if (jsonFolder.children) {
		for (var i = 0; i < jsonFolder.children.length; i++) {
			this.children[i] = new Folder(jsonFolder.children[i], msgsys);
		}
	}
	
	this.selected = false;
	this.collapsed = false;

	if (jsonFolder.collapsed) this.collapsed = true;

	this.htmlinstance = {};
	this.htmlinstance.main = MessageHelper.createDiv(); // msgline, class set later
	this.htmlinstance.main.onmousedown = function(e) {
		e.stopPropagation();
		msgsys.selectFolder(thisobj);
	};
	this.htmlinstance.expandbox = MessageHelper.createDiv("part expandbox icon", this.htmlinstance.main);
	this.htmlinstance.expandbox.onmousedown =  function(e) { 
		e.stopPropagation();
		thisobj.collapsed = !thisobj.collapsed;
		thisobj.updateClass();
	};
	this.htmlinstance.name = MessageHelper.createDiv("first", this.htmlinstance.main, this.name);
	this.htmlinstance.children = MessageHelper.createDiv("children", this.htmlinstance.main);
	for (var i = 0; i < this.children.length; i++) {
		this.htmlinstance.children.appendChild(this.children[i].htmlinstance.main);
	}
	this.htmlinstance.dotsvc = MessageHelper.createDiv("dotsvc", this.htmlinstance.children);
	this.htmlinstance.dotsh = MessageHelper.createDiv("dotsh", this.htmlinstance.main);
	this.htmlinstance.dotsv = MessageHelper.createDiv("dotsv", this.htmlinstance.main);
	
	// initialization continued below!
	
	this.getFolderClass = function() {
		var folderclass = "msgline folder";
		if (this.collapsed) folderclass += " collapsed";
		if (this.selected) folderclass += " selected";
		if (this.children.length > 0) folderclass += " haschildren";
		return folderclass;
	}
	
	this.updateClass = function() {
		if (this.htmlinstance) this.htmlinstance.main.className = this.getFolderClass();
	}
	
	// initialization continues!
	this.updateClass();
}

function FolderContentManager(msgsys)
{	
	var thisobj = this; // use in handlers where "this" is replaced to point to event source
	
	this.msgsys = msgsys;
	this.attributeStore = this.msgsys.attributeStore;
	
	this.messageRegistry = {};
	this.currentuser = msgsys.currentuser;
	
	msgsys.listpane.innerHTML = "";
	msgsys.viewpane.innerHTML = "";
	
	this.selected = null;
	
	this.init = function(dataurl) {
		msgsys.listpane.innerHTML = 'Loading...';
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open('GET', dataurl, true);
		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState == 4) {
				thisobj.init2(xmlHttp.responseText);
			}
		};
		xmlHttp.send(null);
	}
	
	this.init2 = function(response) {
		if (this.msgsys.foldercontentmanager != this) return;
		
		var responseJSON = JSON.parse(response);
		this.loadMessages(responseJSON.messages);
		this.settings = MessageHelper.simpleObjectClone(this.msgsys.settings);
		for (var name in responseJSON.settings) {
			this.settings[name] = responseJSON.settings[name];
		}
		
		this.view = {};
		this.view.main = msgsys.viewpane;
		this.view.header = MessageHelper.createDiv("header",this.view.main);
		this.view.actionbar = MessageHelper.createDiv("actionbar",this.view.header);
		this.view.btnreply = MessageHelper.createDiv("button reply",this.view.actionbar, "Antworten");
		MessageHelper.createDiv("icon",this.view.btnreply);
		this.view.votebuttons = MessageHelper.createDiv("doublebutton vote",this.view.actionbar);
		this.view.btnvoteup = MessageHelper.createDiv("iconbutton vote up",this.view.votebuttons);
		this.view.btnvotedown = MessageHelper.createDiv("iconbutton vote down",this.view.votebuttons);
		this.view.interestbuttons = MessageHelper.createDiv("doublebutton interest",this.view.actionbar);
		this.view.btninterestup = MessageHelper.createDiv("iconbutton interest up",this.view.interestbuttons);
		this.view.btninterestdown = MessageHelper.createDiv("iconbutton interest down",this.view.interestbuttons);
		this.view.subject = MessageHelper.createDiv("subject",this.view.header);
		this.view.date = MessageHelper.createDiv("date",this.view.header);
		this.view.sender = MessageHelper.createDiv("sender",this.view.header);
		this.view.content = MessageHelper.createDiv("content",this.view.main);
		
		this.msgsys.setTitle(this.settings.title);
		msgsys.listpane.innerHTML = '';
		this.addRoot(responseJSON.rootMessages);
		
		this.view.btnreply.onclick = this.btnClickReply;
		this.view.btnvoteup.onclick = this.btnClickVoteUp;
		this.view.btnvotedown.onclick = this.btnClickVoteDown;
		this.view.btninterestup.onclick = this.btnClickInterestUp;
		this.view.btninterestdown.onclick = this.btnClickInterestDown;
		
		this.view.btnreply.style.display = 'none';
		this.view.votebuttons.style.display = 'none';
		this.view.interestbuttons.style.display = 'none';
	}
	
	this.loadMessage = function(msg) {
		var msg2 = new Message(msg, this);
		this.messageRegistry[msg2.id] = msg2;
	}
	
	this.loadMessages = function(msgs) {
		for (var i = 0; i < msgs.length; i++) {
			this.loadMessage(msgs[i]);
		}
	}
	
	this.addRoot = function(ids) {
		for (var i = 0; i < ids.length; i++) {
			var msg = this.messageRegistry[ids[i]];
			if (!msg) throw "Tried to add nonexisting message "+ids[i];
			msg.collapsed = true;
			msgsys.listpane.appendChild(msg.createHTMLInstance());
		}
	}
	
	this.setSelected = function(msg) {
		if (this.selected) {
			this.selected.selected = false;
			this.selected.updateClass();
		}
		this.selected = msg;
		if (msg) {
			msg.selected = true;
			msg.updateClass();
			this.view.subject.textContent = msg.subject;
			this.view.date.textContent = msg.date;
			this.view.sender.textContent = msg.sender;
			if (msg.text === null) {
				this.view.content.innerHTML = 'Loading...';
				this.fetchTexts([msg.id]);
			} else {
				this.view.content.innerHTML = msg.text;
			}
			
			this.view.btnreply.style.display = msg.getSetting('allowReply') ? 'block' : 'none';
			this.view.votebuttons.style.display = msg.getSetting('allowVoting') ? 'block' : 'none';
			this.view.interestbuttons.style.display = msg.getSetting('allowInterest') ? 'block' : 'none';
		}
		this.updateSelectedClass();
	}
	
	this.fetchTexts = function(messages) {
		var msglist = messages.join(",");
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open('POST', this.settings.textsurl, true);
		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState == 4) {
				thisobj.fetchTextsHandler(xmlHttp.responseText);
			}
		}
		xmlHttp.send("ids=" + encodeURIComponent(msglist));
	}
	
	this.fetchTextsHandler = function(response) {
		var responseJSON = JSON.parse(response);
		for (var i = 0; i < responseJSON.length; i++) {
			if (this.messageRegistry[responseJSON[i].id]) {
				var msg = this.messageRegistry[responseJSON[i].id];
				if (msg.text == null) {
					msg.text = responseJSON[i].text;
					if (msg == this.selected) {
						this.view.content.innerHTML = msg.text;
					}
				}
			}
		}
	}
	
	this.updateSelectedClass = function() {
		if (!this.selected) {
			this.view.main.className = "viewpane";
			return;
		}
		this.view.main.className = this.selected.htmlinstance.main.className.replace(/^msgline/, "viewpane");
	}
	
	this.btnClickReply = function(e) {
		alert("not implemented");
	}

	this.btnClickVoteUp = function(e) {
		if (!thisobj.selected) return;
		if (thisobj.selected.attributes.vote == 1) {
			thisobj.selected.setAttribute('vote', 0);
		} else {
			thisobj.selected.setAttribute('vote', 1);
		}
		if (!thisobj.selected.getSetting('autoMarkRead')) thisobj.selected.setAttribute('read',1);
	}
	
	this.btnClickVoteDown = function(e) {
		if (!thisobj.selected) return;
		if (thisobj.selected.attributes.vote == -1) {
			thisobj.selected.setAttribute('vote', 0);
		} else {
			thisobj.selected.setAttribute('vote', -1);
		}
		if (!thisobj.selected.getSetting('autoMarkRead')) thisobj.selected.setAttribute('read',1);
	}
	
	this.btnClickInterestUp = function(e) {
		if (!thisobj.selected) return;
		if (thisobj.selected.attributes.interest == 1) {
			thisobj.selected.setAttribute('interest', 0);
		} else {
			thisobj.selected.setAttribute('interest', 1);
		}
	}
	
	this.btnClickInterestDown = function(e) {
		if (!thisobj.selected) return;
		if (thisobj.selected.attributes.interest == -1) {
			thisobj.selected.setAttribute('interest', 0);
		} else {
			thisobj.selected.setAttribute('interest', -1);
		}
	}
	
}


function Message(jsonMessage, manager)
{
	var thisobj = this; // use in handlers where "this" is replaced to point to event source
	
	this.manager = manager;

    this.id = jsonMessage.id;
	this.subject = jsonMessage.subject || "";
	this.sender = jsonMessage.sender || "";
	this.date = jsonMessage.date || "";
	this.score = jsonMessage.score || 0;
	this.children = jsonMessage.children || [];
	this.attributes = {}
	if (jsonMessage.attributes) {
		this.attributes.starred = jsonMessage.attributes.starred ? jsonMessage.attributes.starred : 0;
		this.attributes.read = jsonMessage.attributes.read ? jsonMessage.attributes.read : 0;
		this.attributes.vote = jsonMessage.attributes.vote ? jsonMessage.attributes.vote : 0;
		this.attributes.interest = jsonMessage.attributes.interest ? jsonMessage.attributes.interest : 0;
	}
	if (jsonMessage.settings) {
		this.settings = jsonMessage.settings;
	}
	
	var loadedAttribs = this.manager.attributeStore.getAttributes(this.id);
	if (loadedAttribs) {
		for (var name in loadedAttribs) {
			this.attributes[name] = loadedAttribs[name];
		}
	}
	
	this.getSetting = function(key) {
		if (this.settings && typeof(this.settings[key]) != 'undefined') {
			return this.settings[key];
		}
		return this.manager.settings[key];
	}
	
	this.text = jsonMessage.text;
	
	this.htmlinstance = null;
	
	this.selected = false;
	this.collapsed = false;
	this.childrenRolledOut = false;
	this.childrenRendered = false;
	
	this.getMsgClass = function() {
		var msgclass = "msgline";
		if (this.collapsed) msgclass += " collapsed";
		if (this.selected) msgclass += " selected";
		if (this.attributes.starred) msgclass += " starred";
		if (this.attributes.read) msgclass += " read";
		if (this.attributes.vote == 1) msgclass += " upvoted";
		if (this.attributes.vote == -1) msgclass += " downvoted";
		if (this.attributes.interest == 1) msgclass += " watched";
		if (this.attributes.interest == -1) msgclass += " ignored";
		if (this.sender == manager.currentuser) msgclass += " own";
		if (this.autoignored) msgclass += " autoignored";
		if (this.children.length > 0) {
			msgclass += " haschildren";
			if (this.cachedHasUnreadChildren) msgclass += " unreadchildren";
			if (this.cachedHasOwnChildren) msgclass += " ownchildren";
		}
		return msgclass;
	}
	
	this.hasUnreadChildren = function() {
		if (!this.children || this.children.length == 0) return false;
		for (var i = 0; i < this.children.length; i++) {
			if (!this.children[i].attributes.read) return true;
			if (this.children[i].hasUnreadChildren()) return true;
		}
		return false;
	}
	
	this.hasOwnChildren = function() {
		if (!this.children || this.children.length == 0) return false;
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i].sender == manager.currentuser) return true;
			if (this.children[i].hasOwnChildren()) return true;
		}
		return false;
	}
	
	this.updateHasUnreadChildren = function() {
		this.cachedHasUnreadChildren = this.hasUnreadChildren();
	}

	this.updateScore = function() {
		if (!this.htmlinstance) return;
		if (!this.htmlinstance.score) return;
		this.htmlinstance.score.textContent = this.score > 0 ? '+' + this.score : this.score;
		var classname = "part score";
		if (this.score > 0) classname = "part score pos";
		if (this.score < 0) classname = "part score neg";
		this.htmlinstance.score.className = classname;
	}
	
	this.createHTMLInstance = function() {
		if (this.htmlinstance != null) throw "Tried to create second instance!";
		
		var h = {}
		h.main = MessageHelper.createDiv(); // msgline, class set later
		
		h.msginfo = MessageHelper.createDiv("msginfo", h.main);
		h.main.onmousedown = this.messageClick;
		h.readbox = MessageHelper.createDiv("part readbox icon", h.msginfo);
		h.readbox.onmousedown = this.toggleRead;
		if (this.manager.settings.showSender) h.sender = MessageHelper.createDiv("part sender", h.msginfo, this.sender);
		if (this.manager.settings.showDate) h.date = MessageHelper.createDiv("part date", h.msginfo, this.date);
		if (this.manager.settings.showScore) h.score = MessageHelper.createDiv("part score", h.msginfo);
		h.votebox = MessageHelper.createDiv("part votebox icon", h.msginfo);
		h.starbox = MessageHelper.createDiv("part starbox icon", h.msginfo);
		h.starbox.onmousedown = this.toggleStar;
		
		h.expandbox = MessageHelper.createDiv("part expandbox icon", h.main);
		h.expandbox.onmousedown = this.toggleExpand;
		h.main.ondblclick = this.toggleExpand;
		h.subject = MessageHelper.createDiv("first", h.main, this.subject);
		h.children = MessageHelper.createDiv("children", h.main);
		h.dotsvc = MessageHelper.createDiv("dotsvc", h.children);
		h.dotsh = MessageHelper.createDiv("dotsh", h.main);
		h.dotsv = MessageHelper.createDiv("dotsv", h.main);
		
		this.rollOutChildren();
		this.updateHasUnreadChildren();
		this.cachedHasOwnChildren = this.hasOwnChildren();

		this.htmlinstance = h;
		this.updateScore();
		this.updateClass();
		return h.main;
	}
	
	this.updateClass = function() {
		if (this.htmlinstance) this.htmlinstance.main.className = this.getMsgClass();
	}
	
	this.setAttribute = function(attribute, value) {
		this.manager.attributeStore.setAttribute(this.id, attribute, value);
		this.attributes[attribute] = value;
		this.updateClass();
		if (this.manager.selected == this) this.manager.updateSelectedClass();
	}
	
	this.toggleRead = function(e) {
		e.stopPropagation();
		thisobj.setAttribute('read', !thisobj.attributes.read);
	}
	
	this.toggleStar = function(e) {
		e.stopPropagation();
		thisobj.setAttribute('starred', !thisobj.attributes.starred);
	}
	
	this.toggleExpand = function(e) { 
		e.stopPropagation();
		if (!thisobj.collapsed) {
			thisobj.collapsed = true;
			thisobj.updateHasUnreadChildren();
			thisobj.updateClass();
		} else {
			thisobj.expand();
		}
	}
	
	this.messageClick = function(e) {
		e.stopPropagation();
		manager.setSelected(thisobj);
		if (thisobj.getSetting('autoMarkRead') && !e.shiftKey) {
			thisobj.setAttribute('read', true);
			thisobj.updateClass();
		}
	}
	
	this.rollOutChildren = function() {
		if (this.childrenRolledOut) return true;
		var ok = true;
		for (var i = 0; i < this.children.length; i++) {
			if (typeof(this.children[i]) == "string") {
				if (manager.messageRegistry[this.children[i]]) {
					this.children[i] = manager.messageRegistry[this.children[i]];
					ok = ok && this.children[i].rollOutChildren();
				} else {
					ok = false;
				}
			}
		}
		this.childrenRolledOut = ok;
		return ok;
	}
	
	this.renderChildren = function() {
		if (this.htmlinstance == null) throw "Cannot render, message has no HTMLInstance";
		if (!this.childrenRolledOut) throw "Cannot render children while they are not rolled out";
		if (this.childrenRendered) return;
		
		for (var i = 0; i < this.children.length; i++) {
			var child = this.children[i];
			this.htmlinstance.children.appendChild(child.createHTMLInstance());
			child.renderChildren();
		}
		
		this.childrenRendered = true;
	}
	
	this.expand = function() {
		if (this.htmlinstance == null) throw "Cannot expand, message has no HTMLInstance";
		if (this.rollOutChildren()) {
			this.renderChildren();
		} else {
			this.htmlinstance.children.textContent = "Children not loaded";
		}
		this.collapsed = false;
		if (this.getSetting('readOnExpand')) this.setAttribute('read', 1);
		this.updateClass();
		
		var missingTexts = this.getThreadMsgsWithoutText();
		if (missingTexts.length > 0) {
			this.manager.fetchTexts(missingTexts);
		}
	}
	
	this.getThreadMsgsWithoutText = function() {
		if (this.allTextsLoaded) return [];
		var missing = (this.text == null) ? [this.id] : [];
		if (this.children) {
			for (var i = 0; i < this.children.length; i++) {
				missing = missing.concat(this.children[i].getThreadMsgsWithoutText());
			}
		}
		if (missing.length == 0) this.allTextsLoaded = true;
		return missing;
	}
	
}
