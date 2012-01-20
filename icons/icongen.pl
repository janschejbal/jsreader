use strict;
use warnings;

my $XPADDING = 1; # padding to add - how much more padding does the PNG have when compared to the HTML element?
my $YPADDING = 1; # padding to add - how much more padding does the PNG have when compared to the HTML element?
my $ICONSIZEX = 20; # including padding!
my $ICONSIZEY = 20; # including padding!
my $COLS = 12;
my $name = "icons16";

my $origcssname = "../messagepane.css";
my $newcssname = "messagepane-replaced.css";


#if ($#ARGV != 0) {
#	print "usage: icongen.pl fileset\n";
#	exit(1);
#}
#
#my $name = $ARGV[0];
#$name =~ s/\.txt$//;

open(ICONLIST, "<", $name.".txt") or die("failed to open icon txt file");
open(CSSFILE, ">", $name.".css") or die("failed to open output css file"); 

my %icons;
print STDERR uc("number\trow\tcolumn\tx-offs.\ty-offs.\tname\n");
my $i = 0;
while (my $icon = <ICONLIST>) {
	chomp $icon;
	if ($icon eq "") { next; }
	my $row = int($i/$COLS);
	my $col = $i%$COLS;
	my $pxx = $ICONSIZEX * $col + $XPADDING;
	my $pxy = $ICONSIZEY * $row + $YPADDING;
	
	print STDERR "#$i\t$row\t$col\t$pxx\t$pxy\t$icon\n";
	
	$pxx = $pxx == 0 ? "0" : "-${pxx}px";
	$pxy = $pxy == 0 ? "0" : "-${pxy}px";
	
	my $cssline = "\t/*ICON:$icon*/\tbackground: url($name.png) no-repeat $pxx $pxy;\n";
	print CSSFILE $cssline;
	$icons{$icon} = $cssline;
	$i++;
}
close(ICONLIST);
close(CSSFILE);

open(ORIGCSS, "<", $origcssname) or die("failed to open replace input css file");
open(NEWCSS, ">", $newcssname) or die("failed to open replace output css file");

while (my $line = <ORIGCSS>) {
	my $replaced = 0;
	if ($line =~ m@^\t/\*ICON:([a-zA-Z0-9-]+)\*/@) {
		print STDERR "Found icon $1...";
		if ($line =~ m@^\t/\*ICON:([a-zA-Z0-9-]+)\*/[^;]+;$@) {
			if ($icons{$1}) {
				$replaced = 1;
				print NEWCSS $icons{$1};
				print STDERR " replaced\n";
			} else {
				print STDERR " unknown, NOT REPLACED\n";
			}
		} else {
			print STDERR " syntax not ok, NOT REPLACED\n";
		}
	}
	if (!$replaced) {
		print NEWCSS $line;
	}
}

close(ORIGCSS);
close(NEWCSS);
