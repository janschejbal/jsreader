<?php
	
$liste = file("antraege.txt");

$folders = array();
$currentfolder = -1;
$folderdata = array();
$groupid = 0;
$usedids = array();

function saveJSON($name, $data) {
	$file = fopen("data/$name", 'w') or die("could not open output file $name");
	fwrite($file, json_encode($data));
	fclose($file);
}


foreach ($liste as $zeile) {
	$zeile = trim($zeile);
	if (preg_match('/^\\s*$/', $zeile) || preg_match('/^\\s*#.*$/', $zeile) ) {
		// skip empty and comment lines
	}
	elseif (preg_match('/^\\s*\\*\\s*(.*)$/', $zeile, $matches)) {
		$currentfolder++;
		$foldername = trim($matches[1]);
		$folders[$currentfolder] = array(
				"id" => "folder$currentfolder",
				"name" => $foldername,
				"dataurl" => "antragsdaten/data/folder$currentfolder.json",
				"expanded" => false
			);
		$folderdata[$currentfolder] = array("messages" => array(), "rootMessages" => array(), "settings" => array("title" => $foldername));
	}
	elseif (preg_match('/^\\s*\\*\\*/', $zeile)) {
		die("Subfolders not implemented");
	}
	elseif (preg_match('/^(.+)\\t(.+)/', $zeile, $matches)) {
		if ($currentfolder < 0) die("Data without folder");
		$groupid++;
		$groupidstring = "group$groupid";
		$groupname = trim($matches[1]);
		$entries = explode(",", trim($matches[2]));
		// todo check validity and prevent re-use of entry id
		if (count($entries) == 1) {
			$countstring = "(Einzelantrag)";
		} else {
			$countstring = "(".count($entries)." konkurr. Anträge)";
		}
		$folderdata[$currentfolder]["rootMessages"][] = $groupidstring;
		foreach ($entries as $entry) {
			$folderdata[$currentfolder]["messages"][] = array("id" => $entry, "subject" => $entry." Antragstitel hier (TODO)", "text" => '<iframe style="border:none;position:absolute;top:0px;height:100%;left:0px;width:100%;" src="http://wiki.piratenpartei.de/Bundesparteitag_2011.2/Antragsportal/'.$entry.'?action=render">', "sender" => "Todo Antragsteller");
		}
		$folderdata[$currentfolder]["messages"][] = array("id" => $groupidstring."directvote", "subject" => "Diese Antragsgruppe direkt abstimmen", "text" => "Wenn du möchtest, dass das Ergebnis der schriftlichen ELWS-Abstimmung direkt und ohne Diskussion als Entscheidung über diese Antragsgruppe zählt, stimme für diesen Punkt. Wenn du möchtest, dass diese Gruppe auf dem Parteitag diskutiert und dann dort abgestimmt wird (i.d.R. per Handzeichen), stimme gegen diesen Punkt.", "sender" => "--------------------");
		$entries[] = $groupidstring."directvote";
		$folderdata[$currentfolder]["messages"][] = array("id" => $groupidstring, "subject" => $groupname, "children" => $entries, "text" => "Öffne die Antragsgruppe, um die Anträge zu sehen", "sender" => $countstring, "settings" => array("allowVoting" => false));
		
	}
	else die("Could not parse line '$zeile'");
}

$settings = array(
		"title" => "Antragsreader-Demo",
		"autoMarkRead" => false,
		"showSender" => true,
		"showDate" => false,
		"showScore" => false,
		"allowReply" => false,
		"allowVoting" => true,
		"allowInterest" => false,
		"readOnExpand" => true
	);
	
saveJSON("main.json", array("folders" => $folders, "settings" => $settings));
for ($i = 0; $i < count($folders); $i++) saveJSON("folder$i.json", $folderdata[$i]);